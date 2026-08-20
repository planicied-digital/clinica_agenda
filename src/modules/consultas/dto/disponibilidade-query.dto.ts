import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class DisponibilidadeQueryDto {
  @IsString()
  medicoId: string;

  // YYYY-MM-DD
  @IsDateString()
  data: string;

  @IsOptional()
  @IsString()
  tipoConsultaId?: string;

  // Alternativa a tipoConsultaId, caso a duração não venha de um tipo cadastrado.
  // Query strings chegam como texto — precisa da conversão explícita para número.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  duracaoMinutos?: number;
}
