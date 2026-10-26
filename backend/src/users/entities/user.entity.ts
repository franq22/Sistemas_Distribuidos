export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type UserRecord = PublicUser & { passwordHash: string };
