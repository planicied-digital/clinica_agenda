/**
 * Popula uma clínica existente com dados de teste: médico, pacientes (com e
 * sem WhatsApp), consultas em datas relativas a hoje (passado/hoje/futuro,
 * cobrindo os status usados pelo painel — comparecimento, falta, aguardando
 * confirmação) e uma pendência de contato manual. Também cria logins de
 * SECRETARIA e MEDICO (o de MEDICO já vinculado ao médico criado).
 *
 * IMPORTANTE sobre fuso horário: fixamos TZ=America/Sao_Paulo antes de
 * qualquer cálculo de data. Sem isso, rodar este script dentro de um
 * container (que por padrão não tem TZ definido e cai em UTC) faz
 * `new Date().setHours(...)` calcular "hoje" em UTC — à noite no Brasil já é
 * o dia seguinte em UTC, então a consulta "de hoje" nascia datada de amanhã e
 * sumia da Agenda de hoje do painel (visto na prática ao popular o ambiente
 * de staging). Isso não usa a lib `date-fns-tz` de propósito — é só uma
 * variável de ambiente, não vale a dependência extra pra um script de dev.
 *
 * Uso:
 *   npx ts-node scripts/seed-dados-teste.ts <clinicaId>
 */
process.env.TZ = 'America/Sao_Paulo';

import { PrismaClient, StatusConsulta, OrigemConsulta, TipoNotificacao, StatusNotificacao } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const SENHA_PADRAO = 'teste123';

function comHora(diasOffset: number, hora: number, minuto: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + diasOffset);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

async function main() {
  const clinicaId = process.argv[2];
  if (!clinicaId) {
    console.error('Uso: npx ts-node scripts/seed-dados-teste.ts <clinicaId>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const clinica = await prisma.clinica.findUnique({ where: { id: clinicaId } });
    if (!clinica) {
      console.error(`Clínica ${clinicaId} não encontrada.`);
      process.exit(1);
    }

    const medico = await prisma.medico.create({
      data: { clinicaId, nome: 'Dr. Teste', especialidade: 'Clínico Geral' },
    });

    const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
    await prisma.usuario.upsert({
      where: { clinicaId_email: { clinicaId, email: 'secretaria@teste.local' } },
      update: { senhaHash, papel: 'SECRETARIA', ativo: true },
      create: { clinicaId, nome: 'Secretária Teste', email: 'secretaria@teste.local', senhaHash, papel: 'SECRETARIA' },
    });
    await prisma.usuario.upsert({
      where: { clinicaId_email: { clinicaId, email: 'medico@teste.local' } },
      update: { senhaHash, papel: 'MEDICO', medicoId: medico.id, ativo: true },
      create: { clinicaId, nome: medico.nome, email: 'medico@teste.local', senhaHash, papel: 'MEDICO', medicoId: medico.id },
    });

    const paciente = await prisma.paciente.create({
      data: { clinicaId, nome: 'Paciente Teste', telefone: '5595991234567', temWhatsapp: true },
    });
    const pacienteSemWhatsapp = await prisma.paciente.create({
      data: { clinicaId, nome: 'Paciente Teste (sem WhatsApp)', telefone: '5595997654321', temWhatsapp: false },
    });

    const consultaPassada = comHora(-5, 10, 0);
    await prisma.consulta.create({
      data: {
        clinicaId, medicoId: medico.id, pacienteId: paciente.id,
        dataHoraInicio: consultaPassada, dataHoraFim: new Date(consultaPassada.getTime() + 30 * 60_000),
        status: StatusConsulta.REALIZADA, origem: OrigemConsulta.SECRETARIA,
      },
    });

    const consultaFalta = comHora(-3, 11, 0);
    await prisma.consulta.create({
      data: {
        clinicaId, medicoId: medico.id, pacienteId: paciente.id,
        dataHoraInicio: consultaFalta, dataHoraFim: new Date(consultaFalta.getTime() + 30 * 60_000),
        status: StatusConsulta.NAO_COMPARECEU, origem: OrigemConsulta.SECRETARIA,
      },
    });

    const consultaHoje = comHora(0, 15, 0);
    await prisma.consulta.create({
      data: {
        clinicaId, medicoId: medico.id, pacienteId: paciente.id,
        dataHoraInicio: consultaHoje, dataHoraFim: new Date(consultaHoje.getTime() + 30 * 60_000),
        status: StatusConsulta.AGUARDANDO_CONFIRMACAO, origem: OrigemConsulta.SECRETARIA,
      },
    });

    const consultaFutura = comHora(3, 9, 30);
    await prisma.consulta.create({
      data: {
        clinicaId, medicoId: medico.id, pacienteId: paciente.id,
        dataHoraInicio: consultaFutura, dataHoraFim: new Date(consultaFutura.getTime() + 20 * 60_000),
        status: StatusConsulta.CONFIRMADA, origem: OrigemConsulta.SECRETARIA,
      },
    });

    await prisma.notificacao.create({
      data: {
        clinicaId, pacienteId: pacienteSemWhatsapp.id,
        tipo: TipoNotificacao.ALERTA_SECRETARIA, status: StatusNotificacao.PENDENTE,
        agendadaPara: new Date(), detalhe: 'Paciente sem WhatsApp — contato manual necessário',
      },
    });

    console.log(`Dados de teste criados na clínica "${clinica.nome}".`);
    console.log(`Login secretária: secretaria@teste.local / ${SENHA_PADRAO}`);
    console.log(`Login médico:     medico@teste.local / ${SENHA_PADRAO}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
