import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseFile, StoredNote } from '../database/database.types';
import { JsonDb } from '../database/json-db';
import { Note, NoteInput } from './entities/note.entity';

function toPublicNote(note: StoredNote): Note {
  const { userId: _userId, ...publicNote } = note;
  return publicNote;
}

@Injectable()
export class NotesRepository {
  constructor(private readonly db: JsonDb) {}

  async findAllByUser(userId: string): Promise<Note[]> {
    const data = await this.db.read();
    return data.notes
      .filter((note) => note.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(toPublicNote);
  }

  create(userId: string, values: NoteInput): Promise<Note> {
    return this.db.update((data) => {
      const note: StoredNote = {
        id: randomUUID(),
        userId,
        ...values,
        createdAt: Date.now(),
        notified: false,
      };
      data.notes.unshift(note);
      return toPublicNote(note);
    });
  }

  update(userId: string, id: string, values: Partial<NoteInput>): Promise<Note | null> {
    return this.db.update((data) => {
      const note = this.findStored(data, userId, id);
      if (!note) return null;
      Object.assign(note, values, { createdAt: Date.now(), notified: false });
      return toPublicNote(note);
    });
  }

  markNotified(userId: string, id: string): Promise<Note | null> {
    return this.db.update((data) => {
      const note = this.findStored(data, userId, id);
      if (!note) return null;
      note.notified = true;
      return toPublicNote(note);
    });
  }

  delete(userId: string, id: string): Promise<boolean> {
    return this.db.update((data) => {
      const index = data.notes.findIndex((note) => note.id === id && note.userId === userId);
      if (index < 0) return false;
      data.notes.splice(index, 1);
      return true;
    });
  }

  private findStored(data: DatabaseFile, userId: string, id: string): StoredNote | undefined {
    return data.notes.find((note) => note.id === id && note.userId === userId);
  }
}
