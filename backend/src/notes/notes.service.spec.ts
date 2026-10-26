import { NotFoundException } from '@nestjs/common';
import { NotesRepository } from './notes.repository';
import { NotesService } from './notes.service';
import { Note } from './entities/note.entity';

describe('NotesService', () => {
  let service: NotesService;
  let repository: jest.Mocked<Pick<NotesRepository, 'findAllByUser' | 'create' | 'update' | 'markNotified' | 'delete'>>;

  const note: Note = {
    id: '6fa0fbc9-69c2-4b76-9295-28a84b3b29df',
    title: 'Repasar',
    text: 'Leer el capítulo',
    color: '#fef08a',
    minutes: 10,
    createdAt: 100,
    notified: false,
  };

  beforeEach(() => {
    repository = {
      findAllByUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      markNotified: jest.fn(),
      delete: jest.fn(),
    };
    service = new NotesService(repository as unknown as NotesRepository);
  });

  it('lista las notas de la cuenta solicitada', async () => {
    repository.findAllByUser.mockResolvedValue([note]);
    await expect(service.findAll('user-1')).resolves.toEqual([note]);
    expect(repository.findAllByUser).toHaveBeenCalledWith('user-1');
  });

  it('crea una nota a través del repositorio', async () => {
    repository.create.mockResolvedValue(note);
    const values = { title: note.title, text: note.text, color: note.color, minutes: note.minutes };
    await expect(service.create('user-1', values)).resolves.toEqual(note);
    expect(repository.create).toHaveBeenCalledWith('user-1', values);
  });

  it('devuelve 404 si intenta actualizar una nota inexistente o ajena', async () => {
    repository.update.mockResolvedValue(null);
    await expect(service.update('user-1', note.id, { title: 'Cambio' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marca como enviado un recordatorio de esa cuenta', async () => {
    repository.markNotified.mockResolvedValue({ ...note, notified: true });
    await expect(service.markNotified('user-1', note.id)).resolves.toEqual({ ...note, notified: true });
  });

  it('elimina una nota y responde cuando no existe', async () => {
    repository.delete.mockResolvedValue(true);
    await expect(service.remove('user-1', note.id)).resolves.toEqual({ ok: true });
    repository.delete.mockResolvedValue(false);
    await expect(service.remove('user-1', note.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
