import { Module } from '@nestjs/common';
import { LibrosModule } from './libros/libros.module';
import { PrestamosModule } from './prestamos/prestamos.module';
import { SaludController } from './salud/salud.controller';
import { SociosModule } from './socios/socios.module';
import { AccessConfig, AuthController, JwtAuth, RefreshTokenProvider } from './auth/auth';

@Module({
  imports: [LibrosModule, SociosModule, PrestamosModule, AccessConfig()],
  controllers: [SaludController, AuthController],
  providers: [JwtAuth, RefreshTokenProvider],
})
export class AppModule {}
