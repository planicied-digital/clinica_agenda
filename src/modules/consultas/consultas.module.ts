import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConsultasService } from './consultas.service';
import { ConsultasController } from './consultas.controller';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { FilaEsperaModule } from '../fila-espera/fila-espera.module';

@Module({
  imports: [NotificacoesModule, FilaEsperaModule, BullModule.registerQueue({ name: 'lembretes' })],
  controllers: [ConsultasController],
  providers: [ConsultasService],
  exports: [ConsultasService],
})
export class ConsultasModule {}
