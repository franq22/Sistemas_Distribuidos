import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginacionDto } from '../../common/dto/paginacion.dto';

export class ConsultaPrestamosDto extends PaginacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  socioId?: number;

  @IsOptional()
  @IsIn(['activo', 'devuelto', 'vencido'])
  estado?: 'activo' | 'devuelto' | 'vencido';
}
