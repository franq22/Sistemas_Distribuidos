import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginacionDto } from './dto/paginacion.dto';

export async function paginarQuery<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  paginacion: PaginacionDto,
) {
  const total = await query.clone().getCount();
  const datos = await query
    .skip((paginacion.pagina - 1) * paginacion.limite)
    .take(paginacion.limite)
    .getMany();
  return {
    datos,
    meta: {
      total,
      pagina: paginacion.pagina,
      limite: paginacion.limite,
      totalPaginas: Math.ceil(total / paginacion.limite),
    },
  };
}
