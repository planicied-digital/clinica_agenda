import { Body, Controller, Get, Logger, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

interface WhatsappWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body: string };
          interactive?: { button_reply?: { id: string; title: string } };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
        }>;
      };
    }>;
  }>;
}

@Controller('whatsapp/webhook')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly webhookService: WhatsappWebhookService,
  ) {}

  // Handshake de verificação exigido pela Meta ao cadastrar a URL do webhook
  // (https://developers.facebook.com/docs/graph-api/webhooks/getting-started).
  @Get()
  verificar(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const tokenEsperado = this.config.get<string>('whatsapp.webhookVerifyToken');
    if (mode === 'subscribe' && verifyToken && verifyToken === tokenEsperado) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send('Verificação inválida');
  }

  @Post()
  async receber(@Body() payload: WhatsappWebhookPayload, @Res() res: Response) {
    // Responde 200 sempre (mesmo em erro de processamento) para evitar que a
    // Meta re-envie o mesmo evento em loop agressivo de retry; falhas ficam
    // registradas no log para investigação manual.
    try {
      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          if (!value) continue;

          for (const mensagem of value.messages ?? []) {
            const buttonId = mensagem.interactive?.button_reply?.id;
            const texto = mensagem.text?.body;
            await this.webhookService.processarMensagemRecebida(mensagem.from, buttonId, texto);
          }

          for (const status of value.statuses ?? []) {
            await this.webhookService.processarAtualizacaoStatus(status.id, status.status);
          }
        }
      }
    } catch (erro) {
      this.logger.error('Erro ao processar webhook do WhatsApp', erro instanceof Error ? erro.stack : String(erro));
    }

    res.status(200).send('EVENT_RECEIVED');
  }
}
