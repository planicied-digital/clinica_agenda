import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePacienteDto {
  @IsString()
  clinicaId: string;

  @IsString()
  @MinLength(2)
  nome: string;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @IsString()
  telefone: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  convenio?: string;

  @IsOptional()
  @IsBoolean()
  temWhatsapp?: boolean;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsString()
  medicoHabitualId?: string;
}
