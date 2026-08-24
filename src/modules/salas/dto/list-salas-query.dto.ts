import { IsString } from 'class-validator';

export class ListSalasQueryDto {
  @IsString()
  clinicaId: string;
}
