import { IsBoolean } from 'class-validator';

export class RegistrarComparecimentoDto {
  @IsBoolean()
  compareceu: boolean;
}
