import { IsOptional, IsString } from 'class-validator';

// Edição de metadados apenas — mudanças de status passam pelas ações
// dedicadas (confirmar/cancelar/remarcar/registrar-comparecimento).
export class UpdateConsultaDto {
  @IsOptional()
  @IsString()
  salaId?: string;

  @IsOptional()
  @IsString()
  tipoConsultaId?: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
