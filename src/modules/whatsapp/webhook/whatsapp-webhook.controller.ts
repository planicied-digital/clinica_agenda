import { Body, Controller, Get, Logger, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response, Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { Public } from '../../../common/auth/public.decorator';

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

// Chamado pela Meta, não por um usuário logado no painel — sem JWT. A
// verificação de handshake (GET) e o verify_token do POST são a autenticação
// deste endpoint.
@Public()
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
  async receber(
    @Body() payload: WhatsappWebhookPayload,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    this.assertAssinaturaValida(req);

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

  // Confirma que o POST veio mesmo da Meta (assinatura HMAC-SHA256 do corpo
  // bruto, com o App Secret como chave — ver main.ts para o rawBody e
  // assert-production-config.ts, que exige WHATSAPP_APP_SECRET em produção).
  // Sem isso, qualquer um poderia forjar "o paciente confirmou/cancelou".
  private assertAssinaturaValida(req: RawBodyRequest<Request>): void {
    const appSecret = this.config.get<string>('whatsapp.appSecret');
    if (!appSecret) {
      // Só chega aqui em dev/test — produção recusa subir sem o segredo.
      return;
    }

    const assinaturaRecebida = req.headers['x-hub-signature-256'];
    if (typeof assinaturaRecebida !== 'string' || !req.rawBody) {
      throw new UnauthorizedException('Assinatura do webhook ausente');
    }

    const assinaturaEsperada =
      'sha256=' + createHmac('sha256', appSecret).update(req.rawBody).digest('hex');

    const bufferRecebido = Buffer.from(assinaturaRecebida);
    const bufferEsperado = Buffer.from(assinaturaEsperada);
    const valida =
      bufferRecebido.length === bufferEsperado.length && timingSafeEqual(bufferRecebido, bufferEsperado);

    if (!valida) {
      throw new UnauthorizedException('Assinatura do webhook inválida');
    }
  }
}
