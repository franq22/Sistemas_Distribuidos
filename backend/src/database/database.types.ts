import type { Note } from '../notes/entities/note.entity';
import type { UserRecord } from '../users/entities/user.entity';

export type StoredNote = Note & { userId: string };
export type DatabaseFile = { users: UserRecord[]; notes: StoredNote[] };

export function emptyDatabase(): DatabaseFile {
  return { users: [], notes: [] };
}
