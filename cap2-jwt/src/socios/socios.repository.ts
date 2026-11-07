import { Injectable } from '@nestjs/common';
import { CrearSocioDto } from './dto/crear-socio.dto';
import { Socio } from './entities/socio.entity';

@Injectable()
export class SociosRepository {
  private socios: Socio[] = [];
  private siguienteId = 1;

  create(datos: Omit<Socio, 'id'>): Socio {
    const socio: Socio = { id: this.siguienteId++, ...datos };
    this.socios.push(socio);
    return socio;
  }

  findAll(): Socio[] {
    return [...this.socios];
  }

  findById(id: number): Socio | undefined {
    return this.socios.find((s) => s.id === id);
  }

  findByEmail(email: string): Socio | undefined {
    return this.socios.find((s) => s.email === email);
  }

  update(id: number, cambios: Partial<Socio>): Socio | undefined {
    const socio = this.findById(id);
    if (socio) Object.assign(socio, cambios);
    return socio;
  }
}
