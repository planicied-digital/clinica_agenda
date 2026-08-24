import { IsOptional, IsString } from 'class-validator';

export class ListTiposConsultaQueryDto {
  @IsString()
  clinicaId: string;

  // Se vier, inclui os tipos genéricos (medicoId nulo) e os específicos desse médico.
  @IsOptional()
  @IsString()
  medicoId?: string;
}
