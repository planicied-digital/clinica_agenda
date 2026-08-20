/**
 * Script de verificação manual — NÃO é usado pela aplicação (nenhum módulo
 * do Nest o importa). Existe só para provar, com evidência real, que a
 * integração LembretesProcessor -> WhatsappService -> Prisma funciona.
 *
 * Pré-requisitos (fora deste ambiente de desenvolvimento assistido, que não
 * tem Node.js/Docker):
 *   1. Node.js instalado e `npm install` rodado na raiz do projeto.
 *   2. Postgres e Redis de pé: `docker compose up -d`.
 *   3. `.env` preenchido com credenciais reais da Cloud API da Meta
 *      (WHATSAPP_API_BASE_URL, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN)
 *      e DATABASE_URL/REDIS_* apontando para o Postgres/Redis do passo 2.
 *   4. Migrations aplicadas: `npx prisma migrate deploy` (ou `dev` na 1ª vez).
 *
 * Uso:
 *   npx ts-node scripts/testar-lembrete-whatsapp.ts <telefone>
 *   (telefone só dígitos, com código do país — ex.: 5511999999999)
 *
 * O script faz duas verificações:
 *   Passo 1 — chama WhatsappService.enviarTemplate() direto, com o template
 *   "hello_world"/en_US (o único que toda conta de teste da Meta já tem
 *   aprovado por padrão) — prova que as credenciais e a chamada HTTP à Cloud
 *   API funcionam, independente dos templates reais de lembrete já existirem.
 *   Passo 2 — cria uma Consulta de teste, enfileira um job "lembrete1" real
 *   na fila `lembretes` e deixa o LembretesProcessor de produção processá-lo
 *   (usando os templates TEMPLATE_LEMBRETE_1/2 hardcoded no processor). Se
 *   esses templates ainda não estiverem aprovados na Meta, essa etapa vai
 *   falhar e mostrar o retry/backoff (attempts=3) em ação — o que também é
 *   evidência válida do comportamento implementado nesta tarefa.
 *
 * Os dados de teste (clínica/médico/paciente/consulta fictícios) são
 * removidos do banco ao final da execução.
 */
import { NestFactory } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OrigemConsulta, StatusConsulta, TipoNotificacao } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { WhatsappService } from '../src/modules/whatsapp/whatsapp.service';

async function main() {
  const telefone = process.argv[2];
  if (!telefone) {
    console.error('Uso: npx ts-node scripts/testar-lembrete-whatsapp.ts <telefone>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const whatsappService = app.get(WhatsappService);
  const lembretesQueue = app.get<Queue>(getQueueToken('lembretes'));

  try {
    console.log('\n=== PASSO 1: conectividade direta com a Cloud API (template hello_world) ===');
    try {
      const messageId = await whatsappService.enviarTemplate(telefone, 'hello_world', 'en_US', []);
      console.log('OK — retorno da Cloud API (messageId):', messageId);
      console.log('Confira o WhatsApp do número informado: a mensagem de exemplo da Meta deve ter chegado.');
    } catch (erro) {
      console.error('Falha no passo 1 — confira WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID no .env:', erro);
    }

    console.log('\n=== PASSO 2: pipeline real (fila "lembretes" -> LembretesProcessor) ===');
    const clinica = await prisma.clinica.create({ data: { nome: '[TESTE] Clínica de verificação' } });
    const medico = await prisma.medico.create({
      data: { clinicaId: clinica.id, nome: '[TESTE] Médico', especialidade: 'Teste' },
    });
    const paciente = await prisma.paciente.create({
      data: { clinicaId: clinica.id, nome: '[TESTE] Paciente', telefone, temWhatsapp: true },
    });
    const dataHoraInicio = new Date(Date.now() + 60 * 60 * 1000);
    const consulta = await prisma.consulta.create({
      data: {
        clinicaId: clinica.id,
        medicoId: medico.id,
        pacienteId: paciente.id,
        dataHoraInicio,
        dataHoraFim: new Date(dataHoraInicio.getTime() + 30 * 60 * 1000),
        origem: OrigemConsulta.SECRETARIA,
        status: StatusConsulta.AGUARDANDO_CONFIRMACAO,
      },
    });
    console.log('Fixture de teste criada — consultaId:', consulta.id);

    const job = await lembretesQueue.add(
      'lembrete1',
      { consultaId: consulta.id },
      { delay: 0, jobId: `teste-manual:${consulta.id}`, attempts: 3, backoff: { type: 'exponential', delay: 60_000 } },
    );
    console.log('Job enfileirado — id:', job.id, '(acompanhe os logs do LembretesProcessor acima/abaixo)');

    console.log('Aguardando o worker processar (até 20s)...');
    let notificacao = null;
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      notificacao = await prisma.notificacao.findFirst({
        where: { consultaId: consulta.id, tipo: TipoNotificacao.LEMBRETE_1 },
        orderBy: { createdAt: 'desc' },
      });
      if (notificacao && notificacao.status !== 'PENDENTE') break;
    }

    console.log('\n=== Registro de Notificacao correspondente (evidência no banco) ===');
    console.log(JSON.stringify(notificacao, null, 2));

    console.log('\n=== Limpeza dos dados de teste ===');
    await prisma.notificacao.deleteMany({ where: { consultaId: consulta.id } });
    await prisma.consulta.delete({ where: { id: consulta.id } });
    await prisma.paciente.delete({ where: { id: paciente.id } });
    await prisma.medico.delete({ where: { id: medico.id } });
    await prisma.clinica.delete({ where: { id: clinica.id } });
    console.log('Fixture removida do banco.');
  } finally {
    await app.close();
  }
}

main().catch((erro) => {
  console.error('Falha no script de teste:', erro);
  process.exit(1);
});
