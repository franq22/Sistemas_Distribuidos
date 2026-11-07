import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';

describe('Libros (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
    // Estado conocido: base de pruebas vacía antes de cada caso
    const bd = app.get(DataSource);
    await bd.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const tabla of ['prestamos', 'socios', 'libros']) {
      await bd.query('TRUNCATE TABLE ' + tabla);
    }
    await bd.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /libros crea un libro y GET /libros/:id lo devuelve', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/libros')
      .send({
        titulo: 'Rayuela',
        autor: 'Julio Cortázar',
        isbn: '9788437604572',
        categoria: 'novela',
        anio: 1963,
        ejemplares: 2,
      })
      .expect(201);

    await request(app.getHttpServer()).get(`/libros/${body.id}`).expect(200);
  });

  it('rechaza un libro inválido con 400', () => {
    return request(app.getHttpServer())
      .post('/libros')
      .send({ titulo: 'X' })
      .expect(400);
  });

  it('pagina, filtra y rechaza parámetros inválidos', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/libros').send({
        titulo: `Título ${i}`, autor: `Autora ${i}`, isbn: `97800000000${i}`,
        categoria: i < 3 ? 'novela' : 'historia', anio: 2000 + i, ejemplares: 1,
      }).expect(201);
    }

    const pagina = await request(app.getHttpServer())
      .get('/libros?pagina=2&limite=2&ordenarPor=categoria&orden=ASC&categoria=novela&anioDesde=2000&anioHasta=2002&q=Título')
      .expect(200);
    expect(pagina.body.datos).toHaveLength(1);
    expect(pagina.body.meta).toMatchObject({ total: 3, pagina: 2, limite: 2, totalPaginas: 2 });
    await request(app.getHttpServer()).get('/libros?limite=101').expect(400);
    await request(app.getHttpServer()).get('/libros?pagina=0').expect(400);
    await request(app.getHttpServer()).get('/libros?ordenarPor=fecha').expect(400);
    await request(app.getHttpServer()).get('/libros?anioDesde=2020&anioHasta=2000').expect(400);
  });

  it('recorre una foto consistente con cursor aunque otro cliente inserte libros', async () => {
    for (let i = 0; i < 7; i++) {
      await request(app.getHttpServer()).post('/libros').send({
        titulo: `Título repetido ${i % 2}`, autor: 'Autora', isbn: `97800000001${i}`,
        categoria: 'novela', anio: 2000, ejemplares: 1,
      }).expect(201);
    }
    const inicial = await request(app.getHttpServer()).get('/libros?limite=20').expect(200);
    const idsIniciales = inicial.body.datos.map((libro: { id: number }) => libro.id).sort((a: number, b: number) => a - b);
    const vistos: number[] = [];
    const primera = await request(app.getHttpServer()).get('/libros/cursor?limite=2').expect(200);
    vistos.push(...primera.body.datos.map((libro: { id: number }) => libro.id));
    let despues: string | null = primera.body.meta.siguiente;
    const siguienteUrl = `/libros/cursor?limite=2&despues=${encodeURIComponent(despues!)}`;
    const [insercion, segundaPagina] = await Promise.all([
      request(app.getHttpServer()).post('/libros').send({
        titulo: 'AAA agregado durante recorrido', autor: 'Otra', isbn: '9780000000199',
        categoria: 'nueva', anio: 2026, ejemplares: 1,
      }).expect(201),
      request(app.getHttpServer()).get(siguienteUrl).expect(200),
    ]);
    expect(insercion.body.id).toBeGreaterThan(Math.max(...idsIniciales));
    vistos.push(...segundaPagina.body.datos.map((libro: { id: number }) => libro.id));
    despues = segundaPagina.body.meta.siguiente;
    do {
      if (!despues) break;
      const respuesta = await request(app.getHttpServer())
        .get(`/libros/cursor?limite=2&despues=${encodeURIComponent(despues)}`).expect(200);
      vistos.push(...respuesta.body.datos.map((libro: { id: number }) => libro.id));
      despues = respuesta.body.meta.siguiente;
    } while (despues);

    expect(new Set(vistos).size).toBe(vistos.length);
    expect([...vistos].sort((a, b) => a - b)).toEqual(idsIniciales);
  });

  it('pagina socios y permite filtrar préstamos por socio y estado', async () => {
    const socio = await request(app.getHttpServer()).post('/socios')
      .send({ nombre: 'Ada Lovelace', email: 'ada@example.test' }).expect(201);
    const otro = await request(app.getHttpServer()).post('/socios')
      .send({ nombre: 'Grace Hopper', email: 'grace@example.test' }).expect(201);
    const socioPage = await request(app.getHttpServer()).get('/socios?pagina=1&limite=1').expect(200);
    expect(socioPage.body.meta).toMatchObject({ total: 2, pagina: 1, limite: 1, totalPaginas: 2 });

    const libro = await request(app.getHttpServer()).post('/libros').send({
      titulo: 'Prueba', autor: 'Autora', isbn: '9780000000200', categoria: 'novela', anio: 2000, ejemplares: 2,
    }).expect(201);
    const prestamoActivo = await request(app.getHttpServer()).post('/prestamos')
      .send({ libroId: libro.body.id, socioId: socio.body.id }).expect(201);
    const prestamoVencido = await request(app.getHttpServer()).post('/prestamos')
      .send({ libroId: libro.body.id, socioId: otro.body.id }).expect(201);
    const prestamos = await request(app.getHttpServer())
      .get(`/prestamos?socioId=${socio.body.id}&estado=activo&limite=10`).expect(200);
    expect(prestamos.body.datos).toHaveLength(1);
    expect(prestamos.body.datos[0].socioId).toBe(socio.body.id);
    expect(prestamos.body.meta.total).toBe(1);
    await request(app.getHttpServer()).post(`/prestamos/${prestamoActivo.body.id}/devolucion`).expect(200);
    const devueltos = await request(app.getHttpServer())
      .get(`/prestamos?socioId=${socio.body.id}&estado=devuelto`).expect(200);
    expect(devueltos.body.datos.map((p: { id: number }) => p.id)).toContain(prestamoActivo.body.id);
    const bd = app.get(DataSource);
    await bd.query('UPDATE prestamos SET vencimiento = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) WHERE id = ?', [prestamoVencido.body.id]);
    const vencidos = await request(app.getHttpServer())
      .get(`/prestamos?socioId=${otro.body.id}&estado=vencido`).expect(200);
    expect(vencidos.body.datos.map((p: { id: number }) => p.id)).toContain(prestamoVencido.body.id);
    const rutaVencidos = await request(app.getHttpServer())
      .get(`/prestamos/vencidos?socioId=${otro.body.id}`).expect(200);
    expect(rutaVencidos.body.meta.total).toBe(1);
    await request(app.getHttpServer()).get('/prestamos?estado=pendiente').expect(400);
    await request(app.getHttpServer()).get('/socios?limite=101').expect(400);
  });
});
