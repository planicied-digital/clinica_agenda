import { Injectable, Logger } from '@nestjs/common';
import { CanalNotificacao, RespostaPaciente, StatusNotificacao, TipoNotificacao } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { normalizarTelefone } from '../../../common/utils/telefone.util';
import { NotificacoesService } from '../../notificacoes/notificacoes.service';
import { ConsultasService } from '../../consultas/consultas.service';

function interpretarResposta(buttonId?: string, texto?: string): RespostaPaciente {
  const codigo = buttonId?.toUpperCase();
  if (codigo === 'CONFIRMAR') return RespostaPaciente.CONFIRMOU;
  if (codigo === 'CANCELAR') return RespostaPaciente.CANCELOU;
  if (codigo === 'REMARCAR') return RespostaPaciente.PEDIU_REMARCACAO;

  const t = (texto ?? '').trim().toLowerCase();
  if (/^(sim|confirmo|confirmar|ok)\b/.test(t)) return RespostaPaciente.CONFIRMOU;
  if (/^(n[aã]o|cancelar|cancelo)\b/.test(t)) return RespostaPaciente.CANCELOU;
  if (/remarcar|remarca[cç][aã]o|outro hor[aá]rio/.test(t)) return RespostaPaciente.PEDIU_REMARCACAO;

  return RespostaPaciente.SEM_RESPOSTA;
}

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoesService: NotificacoesService,
    private readonly consultasService: ConsultasService,
  ) {}

  async processarMensagemRecebida(telefoneOrigem: string, buttonId?: string, texto?: string) {
    const telefone = normalizarTelefone(telefoneOrigem);
    const paciente = await this.prisma.paciente.findFirst({ where: { telefone } });
    if (!paciente) {
      this.logger.warn(`Mensagem recebida de telefone não cadastrado: ${telefone}`);
      return;
    }

    const resposta = interpretarResposta(buttonId, texto);
    const notificacao = await this.notificacoesService.registrarRespostaSeAindaPendente(
      paciente.id,
      resposta,
      texto ?? buttonId,
    );

    if (!notificacao) {
      this.logger.warn(`Nenhuma notificação pendente (ou já respondida) para paciente ${paciente.id}`);
      return;
    }
    if (!notificacao.consultaId) {
      return;
    }

    switch (resposta) {
      case RespostaPaciente.CONFIRMOU:
        await this.consultasService.confirmar(notificacao.consultaId);
        break;

      case RespostaPaciente.CANCELOU:
        await this.consultasService.cancelar(notificacao.consultaId, {
          motivo: 'Cancelado pelo paciente via WhatsApp',
        });
        break;

      case RespostaPaciente.PEDIU_REMARCACAO:
        // TODO: fazer o bot oferecer novos horários direto (seção 4). Por ora,
        // escala para a secretária tratar manualmente.
        await this.prisma.notificacao.create({
          data: {
            clinicaId: notificacao.clinicaId,
            consultaId: notificacao.consultaId,
            pacienteId: notificacao.pacienteId,
            canal: CanalNotificacao.WHATSAPP,
            tipo: TipoNotificacao.ALERTA_SECRETARIA,
            status: StatusNotificacao.PENDENTE,
            agendadaPara: new Date(),
          },
        });
        break;

      case RespostaPaciente.SEM_RESPOSTA:
        break;
    }
  }

  async processarAtualizacaoStatus(whatsappMessageId: string, statusBruto: string) {
    const status = this.mapearStatus(statusBruto);
    if (!status) {
      return;
    }
    await this.notificacoesService.atualizarStatusPorWhatsappMessageId(whatsappMessageId, status);
  }

  private mapearStatus(statusBruto: string): StatusNotificacao | null {
    switch (statusBruto) {
      case 'sent':
        return StatusNotificacao.ENVIADA;
      case 'delivered':
        return StatusNotificacao.ENTREGUE;
      case 'read':
        return StatusNotificacao.LIDA;
      case 'failed':
        return StatusNotificacao.FALHOU;
      default:
        return null;
    }
  }
}
