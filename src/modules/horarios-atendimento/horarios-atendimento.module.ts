import { Module } from '@nestjs/common';
import { HorariosAtendimentoService } from './horarios-atendimento.service';
import { HorariosAtendimentoController } from './horarios-atendimento.controller';

@Module({
  controllers: [HorariosAtendimentoController],
  providers: [HorariosAtendimentoService],
  exports: [HorariosAtendimentoService],
})
export class HorariosAtendimentoModule {}
