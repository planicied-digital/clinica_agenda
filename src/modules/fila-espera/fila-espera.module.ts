import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FilaEsperaService } from './fila-espera.service';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [NotificacoesModule, BullModule.registerQueue({ name: 'fila-espera' })],
  providers: [FilaEsperaService],
  exports: [FilaEsperaService],
})
export class FilaEsperaModule {}
