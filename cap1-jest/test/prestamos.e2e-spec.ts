import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';

describe('Flujo de préstamos (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configurarApp(app);
    await app.init();
  });
  afterEach(async () => app.close());

  async function registrarLibro(ejemplares = 1) {
    const { body } = await request(app.getHttpServer()).post('/libros').send({
      titulo: 'Rayuela', autor: 'Julio Cortázar', isbn: '9788437604572',
      categoria: 'novela', anio: 1963, ejemplares,
    }).expect(201);
    return body;
  }

  async function registrarSocio() {
    const { body } = await request(app.getHttpServer()).post('/socios').send({
      nombre: 'Ana Pérez', email: 'ana@example.edu',
    }).expect(201);
    return body;
  }

  it('registra libro y socio, presta y devuelve reponiendo disponibilidad', async () => {
    const libro = await registrarLibro();
    const socio = await registrarSocio();
    const { body: prestamo } = await request(app.getHttpServer()).post('/prestamos')
      .send({ libroId: libro.id, socioId: socio.id }).expect(201);
    expect(prestamo.vencimiento).toBeDefined();
    await request(app.getHttpServer()).get(`/libros/${libro.id}`).expect(200).expect(({ body }) => {
      expect(body.disponibles).toBe(0);
    });
    await request(app.getHttpServer()).post(`/prestamos/${prestamo.id}/devolucion`).expect(200);
    await request(app.getHttpServer()).get(`/libros/${libro.id}`).expect(200).expect(({ body }) => {
      expect(body.disponibles).toBe(1);
    });
  });

  it('responde 404 por libro o socio inexistente', async () => {
    await registrarLibro();
    await registrarSocio();
    await request(app.getHttpServer()).post('/prestamos').send({ libroId: 999, socioId: 1 }).expect(404);
    await request(app.getHttpServer()).post('/prestamos').send({ libroId: 1, socioId: 999 }).expect(404);
  });

  it('responde 409 sin disponibilidad, en doble devolución y al superar tres préstamos activos', async () => {
    const libro = await registrarLibro();
    const socio = await registrarSocio();
    const { body: primer } = await request(app.getHttpServer()).post('/prestamos')
      .send({ libroId: libro.id, socioId: socio.id }).expect(201);
    await request(app.getHttpServer()).post('/prestamos').send({ libroId: libro.id, socioId: socio.id }).expect(409);
    await request(app.getHttpServer()).post(`/prestamos/${primer.id}/devolucion`).expect(200);
    await request(app.getHttpServer()).post(`/prestamos/${primer.id}/devolucion`).expect(409);

    const libros = await Promise.all([registrarLibro(), registrarLibro(), registrarLibro(), registrarLibro()]);
    const prestamos = [];
    for (const l of libros.slice(0, 3)) {
      const { body } = await request(app.getHttpServer()).post('/prestamos')
        .send({ libroId: l.id, socioId: socio.id }).expect(201);
      prestamos.push(body);
    }
    await request(app.getHttpServer()).post('/prestamos')
      .send({ libroId: libros[3].id, socioId: socio.id }).expect(409);
  });

  it('responde 404 al consultar o devolver un préstamo inexistente y 400 por plazo inválido', async () => {
    await request(app.getHttpServer()).get('/prestamos/999').expect(404);
    await request(app.getHttpServer()).post('/prestamos/999/devolucion').expect(404);
    const libro = await registrarLibro();
    const socio = await registrarSocio();
    await request(app.getHttpServer()).post('/prestamos').send({ libroId: libro.id, socioId: socio.id, dias: 31 }).expect(400);
  });
});
