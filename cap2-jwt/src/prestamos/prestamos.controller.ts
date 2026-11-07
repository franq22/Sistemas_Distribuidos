import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CrearPrestamoDto } from './dto/crear-prestamo.dto';
import { PrestamosService } from './prestamos.service';
import { Current, Roles } from '../auth/auth';

@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly service: PrestamosService) {}

  @Post()
  prestar(@Body() dto: CrearPrestamoDto, @Current() usuario: any) {
    return this.service.prestar(dto, usuario.id);
  }

  @Get()
  listar(@Current() usuario: any) {
    return this.service.listar().filter((p) => p.socioId === usuario.id);
  }

  @Get('vencidos')
  @Roles('bibliotecario')
  vencidos() {
    return this.service.listarVencidos();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @Current() usuario: any) {
    return this.service.obtenerPropio(id, usuario.id);
  }

  @Post(':id/devolucion')
  @HttpCode(200)
  devolver(@Param('id', ParseIntPipe) id: number, @Current() usuario: any) {
    return this.service.devolverPropio(id, usuario.id);
  }
}
