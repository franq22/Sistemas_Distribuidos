import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { DatabaseFile, emptyDatabase } from './database.types';

@Injectable()
export class JsonDb {
  private writeQueue: Promise<unknown> = Promise.resolve();

  filePath(): string {
    const configuredPath = process.env.DATA_FILE;
    if (configuredPath) return isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath);
    return resolve(__dirname, '../../../data/db.json');
  }

  async read(): Promise<DatabaseFile> {
    try {
      const raw = await readFile(this.filePath(), 'utf8');
      const parsed = JSON.parse(raw) as Partial<DatabaseFile>;
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyDatabase();
      throw error;
    }
  }

  update<T>(change: (data: DatabaseFile) => T): Promise<T> {
    const run = this.writeQueue.then(async () => {
      const data = await this.read();
      const result = change(data);
      await this.write(data);
      return result;
    });
    this.writeQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  private async write(data: DatabaseFile): Promise<void> {
    const path = this.filePath();
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, path);
  }
}
