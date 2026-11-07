import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LibrosService } from '../libros/libros.service';
import { SociosService } from '../socios/socios.service';
import { Prestamo } from './entities/prestamo.entity';
import { PrestamosRepository } from './prestamos.repository';
import { PrestamosService } from './prestamos.service';

describe('PrestamosService', () => {
  let service: PrestamosService;
  let repo: {
    create: jest.Mock;
    findActivosPorSocio: jest.Mock;
    findById: jest.Mock;
    findAll: jest.Mock;
    save: jest.Mock;
  };
  let libros: { findOne: jest.Mock; ajustarDisponibles: jest.Mock };
  let socios: { findOne: jest.Mock };
  const libro = { id: 1, disponibles: 2 };
  const prestamoBase = (): Prestamo => ({
    id: 7, libroId: 1, socioId: 2, prestadoEn: '2026-03-01T10:00:00.000Z',
    vencimiento: '2026-03-02T10:00:00.000Z', devueltoEn: null, multa: 0,
  });

  beforeEach(async () => {
    repo = {
      create: jest.fn((data) => ({ id: 7, ...data })),
      findActivosPorSocio: jest.fn().mockReturnValue([]),
      findById: jest.fn(), findAll: jest.fn().mockReturnValue([]),
      save: jest.fn((p) => p),
    };
    libros = { findOne: jest.fn().mockReturnValue({ ...libro }), ajustarDisponibles: jest.fn() };
    socios = { findOne: jest.fn().mockReturnValue({ id: 2 }) };
    const module = await Test.createTestingModule({
      providers: [PrestamosService,
        { provide: PrestamosRepository, useValue: repo },
        { provide: LibrosService, useValue: libros },
        { provide: SociosService, useValue: socios }],
    }).compile();
    service = module.get(PrestamosService);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-01T10:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('usa plazo de 14 días por defecto y descuenta una copia', () => {
    service.prestar({ libroId: 1, socioId: 2 });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      vencimiento: '2026-03-15T10:00:00.000Z', devueltoEn: null, multa: 0,
    }));
    expect(libros.ajustarDisponibles).toHaveBeenCalledWith(1, -1);
  });

  it.each([1, 30])('acepta el plazo límite de %i días', (dias) => {
    service.prestar({ libroId: 1, socioId: 2, dias });
    expect(repo.create.mock.calls[0][0].vencimiento).toBe(
      new Date(Date.parse('2026-03-01T10:00:00.000Z') + dias * 86400000).toISOString(),
    );
  });

  it('presta cuando queda exactamente una copia', () => {
    libros.findOne.mockReturnValue({ id: 1, disponibles: 1 });
    expect(() => service.prestar({ libroId: 1, socioId: 2 })).not.toThrow();
  });

  it('rechaza si no hay copias disponibles', () => {
    libros.findOne.mockReturnValue({ id: 1, disponibles: 0 });
    expect(() => service.prestar({ libroId: 1, socioId: 2 })).toThrow(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rechaza al socio que ya tiene tres préstamos activos, pero permite el tercero', () => {
    repo.findActivosPorSocio.mockReturnValue([{}, {}, {}]);
    expect(() => service.prestar({ libroId: 1, socioId: 2 })).toThrow(ConflictException);
    repo.findActivosPorSocio.mockReturnValue([{}, {}]);
    expect(() => service.prestar({ libroId: 1, socioId: 2 })).not.toThrow();
  });

  it.each([
    ['libro', () => libros.findOne.mockImplementation(() => { throw new NotFoundException(); })],
    ['socio', () => socios.findOne.mockImplementation(() => { throw new NotFoundException(); })],
  ])('propaga 404 si no existe el %s', (_name, setup) => {
    setup();
    expect(() => service.prestar({ libroId: 1, socioId: 2 })).toThrow(NotFoundException);
  });

  it('devuelve el préstamo y repone una copia cuando está a tiempo', () => {
    const p = prestamoBase();
    repo.findById.mockReturnValue(p);
    const result = service.devolver(7);
    expect(result.multa).toBe(0);
    expect(result.devueltoEn).toBe('2026-03-01T10:00:00.000Z');
    expect(libros.ajustarDisponibles).toHaveBeenCalledWith(1, 1);
    expect(repo.save).toHaveBeenCalledWith(p);
  });

  it.each([
    ['justo en vencimiento', '2026-03-02T10:00:00.000Z', 0],
    ['un milisegundo después', '2026-03-02T10:00:00.001Z', 100],
    ['justo un día después', '2026-03-03T10:00:00.000Z', 100],
    ['un milisegundo después de un día', '2026-03-03T10:00:00.001Z', 200],
  ])('calcula multa %s sin esperar', (_label, now, multa) => {
    repo.findById.mockReturnValue(prestamoBase());
    jest.setSystemTime(new Date(now));
    expect(service.devolver(7).multa).toBe(multa);
  });

  it('rechaza devolver dos veces y no repone una copia nuevamente', () => {
    repo.findById.mockReturnValue({ ...prestamoBase(), devueltoEn: '2026-03-01T11:00:00.000Z' });
    expect(() => service.devolver(7)).toThrow(ConflictException);
    expect(libros.ajustarDisponibles).not.toHaveBeenCalled();
  });

  it('retorna 404 para un préstamo inexistente', () => {
    repo.findById.mockReturnValue(undefined);
    expect(() => service.obtener(999)).toThrow(NotFoundException);
    expect(() => service.devolver(999)).toThrow(NotFoundException);
  });

  it('lista préstamos y solo considera vencidos los no devueltos', () => {
    const vencido = { ...prestamoBase(), vencimiento: '2026-02-28T10:00:00.000Z' };
    const devuelto = { ...vencido, id: 8, devueltoEn: '2026-03-01T09:00:00.000Z' };
    const futuro = { ...prestamoBase(), id: 9 };
    repo.findAll.mockReturnValue([vencido, devuelto, futuro]);
    expect(service.listar()).toEqual([vencido, devuelto, futuro]);
    expect(service.listarVencidos()).toEqual([vencido]);
  });
});
