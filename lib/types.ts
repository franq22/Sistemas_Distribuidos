export type Note = {
  id: string;
  title: string;
  text: string;
  color: string;
  minutes: number;
  createdAt: number;
  notified: boolean;
};

export type PublicUser = { id: string; name: string; email: string };
