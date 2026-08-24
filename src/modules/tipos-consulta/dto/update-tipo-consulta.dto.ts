import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateTipoConsultaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  duracaoMinutos?: number;

  @IsOptional()
  @IsString()
  cor?: string;

  @IsOptional()
  @IsString()
  medicoId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
