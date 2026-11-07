import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CrearSocioDto } from './dto/crear-socio.dto';
import { SociosService } from './socios.service';
import { ConsultaSociosDto } from './dto/consulta-socios.dto';
import { Query } from '@nestjs/common';

@Controller('socios')
export class SociosController {
  constructor(private readonly service: SociosService) {}

  @Post()
  create(@Body() dto: CrearSocioDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() consulta: ConsultaSociosDto) {
    return this.service.findAll(consulta);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
