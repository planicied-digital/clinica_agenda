import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSalaDto {
  @IsString()
  clinicaId: string;

  @IsString()
  @MinLength(1)
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}
