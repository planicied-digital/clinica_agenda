import { Module } from '@nestjs/common';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { NotificacoesModule } from '../../notificacoes/notificacoes.module';
import { ConsultasModule } from '../../consultas/consultas.module';
import { FilaEsperaModule } from '../../fila-espera/fila-espera.module';

@Module({
  imports: [NotificacoesModule, ConsultasModule, FilaEsperaModule],
  controllers: [WhatsappWebhookController],
  providers: [WhatsappWebhookService],
})
export class WhatsappWebhookModule {}
