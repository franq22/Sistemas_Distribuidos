import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CrearPrestamoDto } from './dto/crear-prestamo.dto';
import { ConsultaPrestamosDto } from './dto/consulta-prestamos.dto';
import { PrestamosService } from './prestamos.service';

@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly service: PrestamosService) {}

  @Post()
  prestar(@Body() dto: CrearPrestamoDto) {
    return this.service.prestar(dto);
  }

  @Get()
  listar(@Query() consulta: ConsultaPrestamosDto) {
    return this.service.listar(consulta);
  }

  @Get('vencidos')
  vencidos(@Query() consulta: ConsultaPrestamosDto) {
    return this.service.listarVencidos(consulta);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtener(id);
  }

  @Post(':id/devolucion')
  @HttpCode(200)
  devolver(@Param('id', ParseIntPipe) id: number) {
    return this.service.devolver(id);
  }
}
