import { Injectable } from '@nestjs/common';
import { Prisma, RespostaPaciente, StatusNotificacao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListNotificacoesQueryDto } from './dto/list-notificacoes-query.dto';

const STATUS_AGUARDANDO_RESPOSTA: StatusNotificacao[] = [
  StatusNotificacao.ENVIADA,
  StatusNotificacao.ENTREGUE,
  StatusNotificacao.LIDA,
];

@Injectable()
export class NotificacoesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ListNotificacoesQueryDto) {
    const where: Prisma.NotificacaoWhereInput = { clinicaId: query.clinicaId };
    if (query.consultaId) where.consultaId = query.consultaId;
    if (query.pacienteId) where.pacienteId = query.pacienteId;
    if (query.status) where.status = query.status;

    return this.prisma.notificacao.findMany({ where, orderBy: { agendadaPara: 'desc' } });
  }

  // Encontra a última notificação em aberto do paciente e registra a resposta
  // com um update condicional (guardado pelo status lido) para que um webhook
  // duplicado/retransmitido pela Meta não processe a mesma resposta duas vezes
  // (idempotência exigida pela seção 8).
  async registrarRespostaSeAindaPendente(pacienteId: string, resposta: RespostaPaciente, textoBruto?: string) {
    const notificacao = await this.prisma.notificacao.findFirst({
      where: {
        pacienteId,
        status: { in: STATUS_AGUARDANDO_RESPOSTA },
        consultaId: { not: null },
      },
      orderBy: { agendadaPara: 'desc' },
    });

    if (!notificacao) {
      return null;
    }

    const { count } = await this.prisma.notificacao.updateMany({
      where: { id: notificacao.id, status: notificacao.status },
      data: {
        status: StatusNotificacao.RESPONDIDA,
        respostaPaciente: resposta,
        respostaTextoBruto: textoBruto,
        respondidaEm: new Date(),
      },
    });

    if (count === 0) {
      return null; // outra requisição concorrente já processou essa resposta.
    }

    return notificacao;
  }

  async atualizarStatusPorWhatsappMessageId(whatsappMessageId: string, status: StatusNotificacao) {
    const notificacao = await this.prisma.notificacao.findUnique({ where: { whatsappMessageId } });
    if (!notificacao) {
      return null;
    }

    const data: Prisma.NotificacaoUpdateInput = { status };
    if (status === StatusNotificacao.ENVIADA) data.enviadaEm = new Date();
    if (status === StatusNotificacao.ENTREGUE) data.entregueEm = new Date();
    // Não há coluna própria para "lida" no schema atual — só o status muda.

    return this.prisma.notificacao.update({ where: { id: notificacao.id }, data });
  }
}
