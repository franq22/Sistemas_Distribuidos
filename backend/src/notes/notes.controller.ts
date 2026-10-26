import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { SessionGuard } from '../auth/session.guard';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';

@ApiTags('notas')
@UseGuards(SessionGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las notas de la cuenta activa' })
  async findAll(@Req() request: AuthenticatedRequest) {
    return { notes: await this.notes.findAll(request.user.id) };
  }

  @Post()
  @ApiOperation({ summary: 'Crea una nota' })
  async create(@Req() request: AuthenticatedRequest, @Body() dto: CreateNoteDto) {
    return { note: await this.notes.create(request.user.id, dto) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza una nota' })
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return { note: await this.notes.update(request.user.id, id, dto) };
  }

  @Patch(':id/notified')
  @ApiOperation({ summary: 'Marca el recordatorio de una nota como enviado' })
  async markNotified(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { note: await this.notes.markNotified(request.user.id, id) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una nota' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notes.remove(request.user.id, id);
  }
}
