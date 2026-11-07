import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ConsultaLibrosDto, CursorLibrosDto } from './dto/consulta-libros.dto';
import { ActualizarLibroDto } from './dto/actualizar-libro.dto';
import { CrearLibroDto } from './dto/crear-libro.dto';
import { Libro } from './entities/libro.entity';
import { paginarQuery } from '../common/paginacion.util';

@Injectable()
export class LibrosService {
  constructor(
    @InjectRepository(Libro) private readonly repo: Repository<Libro>,
  ) {}

  create(dto: CrearLibroDto): Promise<Libro> {
    return this.repo.save(this.repo.create({ ...dto, disponibles: dto.ejemplares }));
  }

  async findAll(consulta: ConsultaLibrosDto) {
    if (consulta.anioDesde !== undefined && consulta.anioHasta !== undefined && consulta.anioDesde > consulta.anioHasta) {
      throw new BadRequestException('anioDesde no puede ser mayor que anioHasta');
    }
    const qb = this.repo.createQueryBuilder('libro');
    if (consulta.categoria) qb.andWhere('libro.categoria = :categoria', { categoria: consulta.categoria });
    if (consulta.anioDesde !== undefined) qb.andWhere('libro.anio >= :anioDesde', { anioDesde: consulta.anioDesde });
    if (consulta.anioHasta !== undefined) qb.andWhere('libro.anio <= :anioHasta', { anioHasta: consulta.anioHasta });
    if (consulta.q?.trim()) qb.andWhere('(libro.titulo LIKE :q OR libro.autor LIKE :q)', { q: `%${consulta.q.trim()}%` });
    const { pagina, limite, ordenarPor = 'id', orden = 'ASC' } = consulta;
    qb.orderBy(`libro.${ordenarPor}`, orden).addOrderBy('libro.id', orden);
    return paginarQuery(qb, consulta);
  }

  async findCursor(consulta: CursorLibrosDto) {
    let limiteId: number;
    let titulo: string | undefined;
    let id: number | undefined;
    if (consulta.despues) {
      try {
        const decoded = JSON.parse(Buffer.from(consulta.despues, 'base64url').toString('utf8'));
        if (!Number.isSafeInteger(decoded.limiteId) || !Number.isSafeInteger(decoded.id) || typeof decoded.titulo !== 'string') throw new Error();
        ({ limiteId, titulo, id } = decoded);
      } catch {
        throw new BadRequestException('Cursor inválido');
      }
    } else {
      limiteId = await this.repo.createQueryBuilder('libro').select('MAX(libro.id)', 'max').getRawOne().then((r) => Number(r.max ?? 0));
    }
    const qb = this.repo.createQueryBuilder('libro').where('libro.id <= :limiteId', { limiteId });
    if (titulo !== undefined && id !== undefined) {
      qb.andWhere('(libro.titulo > :titulo OR (libro.titulo = :titulo AND libro.id > :id))', { titulo, id });
    }
    const filas = await qb.orderBy('libro.titulo', 'ASC').addOrderBy('libro.id', 'ASC').take(consulta.limite + 1).getMany();
    const hayMas = filas.length > consulta.limite;
    const datos = filas.slice(0, consulta.limite);
    const ultimo = datos.at(-1);
    const siguiente = hayMas && ultimo
      ? Buffer.from(JSON.stringify({ limiteId, titulo: ultimo.titulo, id: ultimo.id })).toString('base64url')
      : null;
    return { datos, meta: { limite: consulta.limite, siguiente } };
  }

  async findOne(id: number): Promise<Libro> {
    const libro = await this.repo.findOneBy({ id });
    if (!libro) throw new NotFoundException(`El libro ${id} no existe`);
    return libro;
  }

  async update(id: number, dto: ActualizarLibroDto): Promise<Libro> {
    const libro = await this.findOne(id);
    return this.repo.save(Object.assign(libro, dto));
  }

  async remove(id: number): Promise<void> {
    const { affected } = await this.repo.delete(id);
    if (!affected) throw new NotFoundException(`El libro ${id} no existe`);
  }

  // Suma (o resta, si es negativo) ejemplares disponibles
  async ajustarDisponibles(id: number, delta: number): Promise<Libro> {
    const libro = await this.findOne(id);
    libro.disponibles += delta;
    return this.repo.save(libro);
  }
}
