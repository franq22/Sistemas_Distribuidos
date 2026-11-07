import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CrearSocioDto } from './dto/crear-socio.dto';
import { Socio } from './entities/socio.entity';
import { SociosRepository } from './socios.repository';
import { PasswordHasher } from '@nestjs/authentication';

@Injectable()
export class SociosService {
  constructor(private readonly repo: SociosRepository, private readonly hasher: PasswordHasher) {}

  async create(dto: CrearSocioDto): Promise<Omit<Socio, 'contrasenaHash'>> {
    if (this.repo.findByEmail(dto.email)) {
      throw new ConflictException('Ya existe un socio con ese email');
    }
    const { contrasena, ...datos } = dto;
    const socio = this.repo.create({ ...datos, contrasenaHash: await this.hasher.hash(contrasena), rol: 'socio' });
    return this.publico(socio);
  }

  findAll(): Omit<Socio, 'contrasenaHash'>[] {
    return this.repo.findAll().map((s) => this.publico(s));
  }

  findOne(id: number): Omit<Socio, 'contrasenaHash'> {
    const socio = this.repo.findById(id);
    if (!socio) throw new NotFoundException(`El socio ${id} no existe`);
    return this.publico(socio);
  }

  autenticar(email: string, contrasena: string): Promise<boolean> {
    return this.hasher.verify(contrasena, this.repo.findByEmail(email)?.contrasenaHash);
  }

  porEmail(email: string): Socio | undefined { return this.repo.findByEmail(email); }
  entidad(id: number): Socio | undefined { return this.repo.findById(id); }

  private publico(socio: Socio): Omit<Socio, 'contrasenaHash'> {
    const { contrasenaHash: _hash, ...publico } = socio;
    return publico;
  }
}
