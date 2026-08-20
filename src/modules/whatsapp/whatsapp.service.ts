import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface BotaoResposta {
  id: string;
  titulo: string;
}

interface RespostaEnvioWhatsapp {
  messages?: Array<{ id: string }>;
}

// Cliente para a Cloud API oficial da Meta (seção 7 — "mais barata, mais
// trabalho de integração"). Usa fetch nativo do Node 18+, sem dependência extra.
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  async enviarTexto(telefone: string, texto: string): Promise<string | undefined> {
    return this.enviar({
      messaging_product: 'whatsapp',
      to: telefone,
      type: 'text',
      text: { body: texto },
    });
  }

  // Botões de resposta rápida (Confirmar/Cancelar/Remarcar) — muito mais
  // confiável de interpretar no webhook do que texto livre.
  async enviarBotoes(telefone: string, texto: string, botoes: BotaoResposta[]): Promise<string | undefined> {
    return this.enviar({
      messaging_product: 'whatsapp',
      to: telefone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: texto },
        action: {
          buttons: botoes.map((botao) => ({
            type: 'reply',
            reply: { id: botao.id, title: botao.titulo },
          })),
        },
      },
    });
  }

  // Mensagens iniciadas pela clínica fora da janela de 24h de atendimento
  // exigem um template pré-aprovado pela Meta — texto livre é rejeitado
  // nesse caso. Lembretes/confirmações proativos devem usar este método.
  async enviarTemplate(
    telefone: string,
    nomeTemplate: string,
    idioma: string,
    parametros: string[] = [],
  ): Promise<string | undefined> {
    return this.enviar({
      messaging_product: 'whatsapp',
      to: telefone,
      type: 'template',
      template: {
        name: nomeTemplate,
        language: { code: idioma },
        components: parametros.length
          ? [{ type: 'body', parameters: parametros.map((texto) => ({ type: 'text', text: texto })) }]
          : [],
      },
    });
  }

  private async enviar(payload: Record<string, unknown>): Promise<string | undefined> {
    const baseUrl = this.config.get<string>('whatsapp.baseUrl');
    const phoneNumberId = this.config.get<string>('whatsapp.phoneNumberId');
    const accessToken = this.config.get<string>('whatsapp.accessToken');

    const resposta = await fetch(`${baseUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const corpo = (await resposta.json()) as RespostaEnvioWhatsapp;

    if (!resposta.ok) {
      this.logger.error(`Falha ao enviar WhatsApp: ${resposta.status} ${JSON.stringify(corpo)}`);
      throw new Error(`Falha ao enviar mensagem WhatsApp (status ${resposta.status})`);
    }

    // Id usado para correlacionar os callbacks de status (sent/delivered/read)
    // recebidos depois no webhook — deve ser salvo em Notificacao.whatsappMessageId.
    return corpo.messages?.[0]?.id;
  }
}
