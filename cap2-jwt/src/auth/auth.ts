import { Body, Controller, Get, Injectable, Post, UnauthorizedException, createParamDecorator, ExecutionContext, SetMetadata, CanActivate, ForbiddenException, applyDecorators, UseGuards } from '@nestjs/common';
import { AuthenticationError, AuthenticationModule, AuthenticationProvider, AuthenticationRegistry, Authenticate, JwtBearerProvider, JwtClaims, Public, TokenService } from '@nestjs/authentication';
import { SociosService } from '../socios/socios.service';
import { SociosRepository } from '../socios/socios.repository';
import { IsEmail, IsString, MinLength } from 'class-validator';

export const AccessConfig = () => AuthenticationModule.forRoot({ accessToken: { key: process.env.JWT_SECRET || 'biblioteca-clave-desarrollo-minimo-32-bytes', issuer: process.env.JWT_ISSUER || 'biblioteca-universitaria', ttl: (process.env.JWT_TTL || '5m') as `${number}${'ms'|'s'|'m'|'h'|'d'}` }, refreshToken: { ttl: (process.env.JWT_REFRESH_TTL || '7d') as `${number}${'ms'|'s'|'m'|'h'|'d'}` }, allowInMemoryStorage: true });
export class LoginDto { @IsEmail() email: string; @IsString() contrasena: string; }
export class RefreshDto { @IsString() refreshToken: string; }
export const Roles = (...roles: string[]) => applyDecorators(SetMetadata('roles', roles), UseGuards(RoleGuard));
export const Current = createParamDecorator((_d: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user);
const RotatedTokens = createParamDecorator((_d: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().rotatedTokens);

@Injectable()
export class JwtAuth extends JwtBearerProvider<any> {
  constructor(private socios: SociosService, registry: AuthenticationRegistry) { super(); registry.registerProvider(this); }
  async validate(claims: JwtClaims) { const socio = this.socios.entidad(Number(claims.sub)); return socio ? { id: socio.id, email: socio.email, rol: socio.rol } : null; }
}

@Injectable()
export class RefreshTokenProvider extends AuthenticationProvider<{ id: string }> {
  constructor(private tokens: TokenService, registry: AuthenticationRegistry) {
    super();
    registry.registerProvider(this, { order: 1 });
  }

  async authenticate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const refreshToken = req.body?.refreshToken;
    if (typeof refreshToken !== 'string' || !refreshToken) return null;
    try {
      req.rotatedTokens = await this.tokens.refresh(refreshToken);
      return { user: { id: 'refresh-token' } };
    } catch (cause) {
      throw new AuthenticationError('Refresh token inválido', { cause });
    }
  }
}
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private socios: SociosRepository) {}
  canActivate(ctx: ExecutionContext) {
    const roles = Reflect.getMetadata('roles', ctx.getHandler()) as string[] | undefined;
    if (!roles) return true;
    const user = ctx.switchToHttp().getRequest().user;
    const actual = this.socios.findById(Number(user?.id));
    if (!actual || !roles.includes(actual.rol)) throw new ForbiddenException();
    return true;
  }
}
@Controller('auth')
export class AuthController {
  constructor(private socios: SociosService, private tokens: TokenService) {}
  @Public() @Post('login') async login(@Body() dto: LoginDto) {
    if (!(await this.socios.autenticar(dto.email, dto.contrasena))) throw new UnauthorizedException();
    const s = this.socios.porEmail(dto.email)!;
    return this.tokens.issue(String(s.id), { claims: { email: s.email, rol: s.rol } });
  }
  @Authenticate({ providers: [RefreshTokenProvider] })
  @Post('refresh') async refresh(@Body() _dto: RefreshDto, @RotatedTokens() tokens: unknown) {
    return tokens;
  }
  @Post('logout') async logout(@Body() dto: RefreshDto) { await this.tokens.revoke(dto.refreshToken); return { ok: true }; }
  @Post('logout-todos') async logoutTodos(@Current() user: any) { await this.tokens.revokeAll(String(user.id)); return { ok: true }; }
}
