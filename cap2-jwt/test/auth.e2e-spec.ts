import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';

@Controller('_prueba')
class RutaNuevaProtegida {
  @Get('ruta-nueva') obtener() { return { protegida: true }; }
}

@Module({ imports: [AppModule], controllers: [RutaNuevaProtegida] })
class AppE2eModule {}

describe('Autenticación global (e2e)', () => {
  let app: INestApplication<App>;
  beforeEach(async () => {
    const module = await Test.createTestingModule({ imports: [AppE2eModule] }).compile();
    app = module.createNestApplication(); configurarApp(app); await app.init();
  });
  afterEach(async () => app.close());

  it('deja públicas salud, registro y login; protege rutas existentes y nuevas', async () => {
    await request(app.getHttpServer()).get('/salud').expect(200);
    await request(app.getHttpServer()).post('/socios').send({ nombre: 'Ana', email: 'ana@example.edu', contrasena: 'clave-segura' }).expect(201);
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: 'ana@example.edu', contrasena: 'clave-segura' }).expect(201);
    expect(login.body.accessToken).toBeDefined();
    expect(JSON.stringify(login.body)).not.toContain('clave-segura');
    await request(app.getHttpServer()).get('/libros').expect(401);
    await request(app.getHttpServer()).get('/libros').set('Authorization', 'Bearer invalido').expect(401);
    await request(app.getHttpServer()).get('/socios').expect(401);
    await request(app.getHttpServer()).get('/_prueba/ruta-nueva').expect(401);
    await request(app.getHttpServer()).get('/_prueba/ruta-nueva').set('Authorization', 'Bearer invalido').expect(401);
    await request(app.getHttpServer()).get('/_prueba/ruta-nueva').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200);
    await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(401);
  });
});
