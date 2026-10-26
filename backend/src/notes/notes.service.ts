import { Injectable, NotFoundException } from '@nestjs/common';
import { NoteInput } from './entities/note.entity';
import { NotesRepository } from './notes.repository';

@Injectable()
export class NotesService {
  constructor(private readonly repository: NotesRepository) {}

  findAll(userId: string) {
    return this.repository.findAllByUser(userId);
  }

  create(userId: string, values: NoteInput) {
    return this.repository.create(userId, values);
  }

  async update(userId: string, id: string, values: Partial<NoteInput>) {
    const note = await this.repository.update(userId, id, values);
    if (!note) throw new NotFoundException('Nota no encontrada.');
    return note;
  }

  async markNotified(userId: string, id: string) {
    const note = await this.repository.markNotified(userId, id);
    if (!note) throw new NotFoundException('Nota no encontrada.');
    return note;
  }

  async remove(userId: string, id: string) {
    const deleted = await this.repository.delete(userId, id);
    if (!deleted) throw new NotFoundException('Nota no encontrada.');
    return { ok: true as const };
  }
}
