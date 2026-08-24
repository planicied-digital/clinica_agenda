import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusNotificacao, TipoNotificacao } from '@prisma/client';

export class ListNotificacoesQueryDto {
  @IsString()
  clinicaId: string;

  @IsOptional()
  @IsString()
  consultaId?: string;

  @IsOptional()
  @IsString()
  pacienteId?: string;

  @IsOptional()
  @IsEnum(StatusNotificacao)
  status?: StatusNotificacao;

  @IsOptional()
  @IsEnum(TipoNotificacao)
  tipo?: TipoNotificacao;
}
