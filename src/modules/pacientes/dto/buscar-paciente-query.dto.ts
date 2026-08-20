import { IsOptional, IsString } from 'class-validator';

export class BuscarPacienteQueryDto {
  @IsString()
  clinicaId: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  cpf?: string;
}
