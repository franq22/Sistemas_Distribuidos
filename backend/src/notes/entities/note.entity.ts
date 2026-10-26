export type Note = {
  id: string;
  title: string;
  text: string;
  color: string;
  minutes: number;
  createdAt: number;
  notified: boolean;
};

export type NoteInput = Pick<Note, 'title' | 'text' | 'color' | 'minutes'>;
