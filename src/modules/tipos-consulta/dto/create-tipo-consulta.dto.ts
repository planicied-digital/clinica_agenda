import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateTipoConsultaDto {
  @IsString()
  clinicaId: string;

  @IsString()
  @MinLength(2)
  nome: string;

  @IsInt()
  @Min(5)
  duracaoMinutos: number;

  @IsOptional()
  @IsString()
  cor?: string;

  // Nulo/omitido = tipo genérico, disponível para qualquer médico da clínica.
  @IsOptional()
  @IsString()
  medicoId?: string;
}
