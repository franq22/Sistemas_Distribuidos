import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { UsersRepository } from '../users/users.repository';
import { PublicUser, UserRecord } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const scrypt = promisify(scryptCallback);
const sessionSeconds = 60 * 60 * 24 * 7;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const salt = randomBytes(16).toString('hex');
    const key = (await scrypt(dto.password, salt, 64)) as Buffer;
    const user: UserRecord = {
      id: randomUUID(),
      name: dto.name.trim(),
      email,
      passwordHash: `${salt}:${key.toString('hex')}`,
    };
    const created = await this.users.create(user);
    if (!created) throw new ConflictException('Ese email ya tiene una cuenta.');
    return { user: created, token: this.createSession(created.id) };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email.trim().toLowerCase());
    if (!user || !(await this.verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }
    return {
      user: this.toPublicUser(user),
      token: this.createSession(user.id),
    };
  }

  async sessionUser(token: string | undefined): Promise<PublicUser | null> {
    const userId = this.readSession(token);
    if (!userId) return null;
    const user = await this.users.findById(userId);
    return user ? this.toPublicUser(user) : null;
  }

  private async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [salt, expectedHex] = stored.split(':');
    if (!salt || !expectedHex) return false;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private createSession(userId: string): string {
    const payload = Buffer.from(
      JSON.stringify({ sub: userId, exp: Date.now() + sessionSeconds * 1000 }),
    ).toString('base64url');
    const content = `v1.${payload}`;
    return `${content}.${this.sign(content)}`;
  }

  private readSession(token: string | undefined): string | null {
    if (!token) return null;
    const [version, payload, signature, extra] = token.split('.');
    if (version !== 'v1' || !payload || !signature || extra) return null;
    const content = `${version}.${payload}`;
    const expected = Buffer.from(this.sign(content));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        sub?: unknown;
        exp?: unknown;
      };
      if (
        typeof data.sub !== 'string' ||
        typeof data.exp !== 'number' ||
        data.exp < Date.now()
      ) {
        return null;
      }
      return data.sub;
    } catch {
      return null;
    }
  }

  private sign(value: string): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('Falta configurar AUTH_SECRET en producción.');
    }
    return createHmac('sha256', secret ?? 'notas-app-secret-solo-desarrollo')
      .update(value)
      .digest('base64url');
  }

  private toPublicUser(user: UserRecord): PublicUser {
    return { id: user.id, name: user.name, email: user.email };
  }
}
