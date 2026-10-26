import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const allowedColors = ['#fef08a', '#bae6fd', '#bbf7d0', '#fbcfe8'];

export class CreateNoteDto {
  @ApiProperty({ maxLength: 100 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @ApiProperty({ maxLength: 2000, required: false, default: '' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(2000)
  text = '';

  @ApiProperty({ enum: allowedColors })
  @IsIn(allowedColors)
  color!: string;

  @ApiProperty({ minimum: 1, maximum: 10080, type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10080)
  minutes!: number;
}
