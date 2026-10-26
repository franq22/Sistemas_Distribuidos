import { Injectable } from '@nestjs/common';
import { JsonDb } from '../database/json-db';
import { PublicUser, UserRecord } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(private readonly db: JsonDb) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const data = await this.db.read();
    return data.users.find((user) => user.email === email) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const data = await this.db.read();
    return data.users.find((user) => user.id === id) ?? null;
  }

  create(user: UserRecord): Promise<PublicUser | null> {
    return this.db.update((data) => {
      if (data.users.some((existing) => existing.email === user.email)) return null;
      data.users.push(user);
      return { id: user.id, name: user.name, email: user.email };
    });
  }
}
