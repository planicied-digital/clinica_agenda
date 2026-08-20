import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

// Só o cliente de envio (Cloud API). O webhook de recebimento vive em
// WhatsappWebhookModule — separado para evitar ciclo de módulos, já que o
// webhook depende de ConsultasModule/NotificacoesModule e estas, por sua vez,
// precisam enviar mensagens através deste módulo.
@Module({
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
