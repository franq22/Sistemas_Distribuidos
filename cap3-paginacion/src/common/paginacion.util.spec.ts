import { PaginacionDto } from './dto/paginacion.dto';
import { paginarQuery } from './paginacion.util';

describe('paginarQuery', () => {
  it('devuelve datos y metadatos y traduce página/límite a skip/take', async () => {
    const datos = [{ id: 3 }, { id: 4 }];
    const query: any = {
      clone: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(12),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(datos),
    };
    const paginacion = { pagina: 2, limite: 2 } as PaginacionDto;

    await expect(paginarQuery(query, paginacion)).resolves.toEqual({
      datos,
      meta: { total: 12, pagina: 2, limite: 2, totalPaginas: 6 },
    });
    expect(query.skip).toHaveBeenCalledWith(2);
    expect(query.take).toHaveBeenCalledWith(2);
    expect(query.getCount).toHaveBeenCalledTimes(1);
  });

  it('informa cero páginas cuando no hay resultados', async () => {
    const query: any = {
      clone: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    await expect(paginarQuery(query, { pagina: 1, limite: 20 } as PaginacionDto)).resolves.toMatchObject({
      datos: [], meta: { total: 0, totalPaginas: 0 },
    });
  });
});
