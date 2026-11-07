import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginacionDto } from '../../common/dto/paginacion.dto';

export class ConsultaLibrosDto extends PaginacionDto {
  @IsOptional() @IsIn(['id', 'titulo', 'autor', 'isbn', 'categoria', 'anio', 'ejemplares', 'disponibles'])
  ordenarPor = 'id';

  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsIn(['ASC', 'DESC'])
  orden: 'ASC' | 'DESC' = 'ASC';

  @IsOptional() @IsString() categoria?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1450) @Max(2100) anioDesde?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1450) @Max(2100) anioHasta?: number;
  @IsOptional() @IsString() q?: string;
}

export class CursorLibrosDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limite = 20;

  @IsOptional() @IsString() despues?: string;
}
