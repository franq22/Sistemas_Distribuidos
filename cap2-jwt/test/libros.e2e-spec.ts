import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { SociosRepository } from '../src/socios/socios.repository';

describe('Libros (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeEach(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();

    await request(app.getHttpServer()).post('/socios').send({
      nombre: 'Bibliotecaria',
      email: 'bibliotecaria@example.edu',
      contrasena: 'clave-segura',
    }).expect(201);
    app.get(SociosRepository).update(1, { rol: 'bibliotecario' });
    const login = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'bibliotecaria@example.edu',
      contrasena: 'clave-segura',
    }).expect(201);
    token = login.body.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /libros crea un libro y GET /libros/:id lo devuelve', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/libros')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Rayuela',
        autor: 'Julio Cortázar',
        isbn: '9788437604572',
        categoria: 'novela',
        anio: 1963,
        ejemplares: 2,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/libros/${body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('rechaza un libro inválido con 400', () => {
    return request(app.getHttpServer())
      .post('/libros')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'X' })
      .expect(400);
  });
});
