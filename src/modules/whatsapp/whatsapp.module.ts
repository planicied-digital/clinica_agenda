import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappWebhookController } from './webhook/whatsapp-webhook.controller';
import { WhatsappWebhookService } from './webhook/whatsapp-webhook.service';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { ConsultasModule } from '../consultas/consultas.module';

@Module({
  imports: [NotificacoesModule, ConsultasModule],
  controllers: [WhatsappWebhookController],
  providers: [WhatsappService, WhatsappWebhookService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
