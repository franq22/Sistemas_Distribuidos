import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthenticatedRequest } from './authenticated-request';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionGuard } from './session.guard';

const cookieName = 'notas_session';
const cookieMaxAge = 60 * 60 * 24 * 7 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: cookieMaxAge,
  };
}

@ApiTags('autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registra una cuenta e inicia sesión' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(dto);
    response.cookie(cookieName, result.token, cookieOptions());
    return { user: result.user };
  }

  @Post('login')
  @ApiOperation({ summary: 'Inicia sesión' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto);
    response.cookie(cookieName, result.token, cookieOptions());
    return { user: result.user };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Cierra sesión' })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(cookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Devuelve la cuenta autenticada' })
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }
}
