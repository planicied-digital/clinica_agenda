-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('ADMIN', 'SECRETARIA', 'MEDICO');

-- CreateEnum
CREATE TYPE "StatusConsulta" AS ENUM ('SOLICITADA', 'AGUARDANDO_CONFIRMACAO', 'CONFIRMADA', 'CANCELADA', 'REMARCADA', 'REALIZADA', 'NAO_COMPARECEU');

-- CreateEnum
CREATE TYPE "OrigemConsulta" AS ENUM ('PACIENTE_NOVO', 'PACIENTE_ANTIGO', 'RETORNO', 'SECRETARIA');

-- CreateEnum
CREATE TYPE "TipoFilaEspera" AS ENUM ('VAGA_ESPECIFICA', 'JANELA_PERIODO');

-- CreateEnum
CREATE TYPE "StatusFilaEspera" AS ENUM ('AGUARDANDO', 'NOTIFICADO', 'ACEITO', 'RECUSADO', 'EXPIRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CanalNotificacao" AS ENUM ('WHATSAPP');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('CONFIRMACAO_SOLICITACAO', 'LEMBRETE_1', 'LEMBRETE_2', 'ALERTA_SECRETARIA', 'FILA_ESPERA_OFERTA', 'LEMBRETE_RETORNO', 'CANCELAMENTO', 'REMARCACAO');

-- CreateEnum
CREATE TYPE "StatusNotificacao" AS ENUM ('PENDENTE', 'ENFILEIRADA', 'ENVIADA', 'ENTREGUE', 'LIDA', 'RESPONDIDA', 'FALHOU', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "RespostaPaciente" AS ENUM ('CONFIRMOU', 'CANCELOU', 'PEDIU_REMARCACAO', 'SEM_RESPOSTA');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO');

-- CreateEnum
CREATE TYPE "TipoBloqueio" AS ENUM ('FERIADO', 'FERIAS', 'LICENCA', 'EVENTO', 'BLOQUEIO_PONTUAL');

-- CreateTable
CREATE TABLE "clinicas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "reguaLembrete1Horas" INTEGER NOT NULL DEFAULT 48,
    "reguaLembrete2Horas" INTEGER NOT NULL DEFAULT 2,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL,
    "medicoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicos" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "crm" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_consulta" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT,
    "nome" TEXT NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL,
    "cor" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3),
    "telefone" TEXT NOT NULL,
    "cpf" TEXT,
    "convenio" TEXT,
    "temWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "medicoHabitualId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultas" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipoConsultaId" TEXT,
    "salaId" TEXT,
    "dataHoraInicio" TIMESTAMP(3) NOT NULL,
    "dataHoraFim" TIMESTAMP(3) NOT NULL,
    "status" "StatusConsulta" NOT NULL DEFAULT 'SOLICITADA',
    "origem" "OrigemConsulta" NOT NULL,
    "motivo" TEXT,
    "observacoes" TEXT,
    "motivoCancelamento" TEXT,
    "canceladaEm" TIMESTAMP(3),
    "remarcadaDeId" TEXT,
    "necessitaRetorno" BOOLEAN NOT NULL DEFAULT false,
    "retornoPrazoDiasMin" INTEGER,
    "retornoPrazoDiasMax" INTEGER,
    "retornoJanelaInicio" TIMESTAMP(3),
    "retornoJanelaFim" TIMESTAMP(3),
    "consultaOrigemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fila_de_espera" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" "TipoFilaEspera" NOT NULL,
    "consultaVagaId" TEXT,
    "dataHoraSlot" TIMESTAMP(3),
    "janelaInicio" TIMESTAMP(3),
    "janelaFim" TIMESTAMP(3),
    "prioridade" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusFilaEspera" NOT NULL DEFAULT 'AGUARDANDO',
    "notificadoEm" TIMESTAMP(3),
    "expiraEm" TIMESTAMP(3),
    "respondidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fila_de_espera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "consultaId" TEXT,
    "pacienteId" TEXT NOT NULL,
    "canal" "CanalNotificacao" NOT NULL DEFAULT 'WHATSAPP',
    "tipo" "TipoNotificacao" NOT NULL,
    "status" "StatusNotificacao" NOT NULL DEFAULT 'PENDENTE',
    "agendadaPara" TIMESTAMP(3) NOT NULL,
    "enviadaEm" TIMESTAMP(3),
    "entregueEm" TIMESTAMP(3),
    "respondidaEm" TIMESTAMP(3),
    "respostaPaciente" "RespostaPaciente",
    "respostaTextoBruto" TEXT,
    "whatsappMessageId" TEXT,
    "tentativa" INTEGER NOT NULL DEFAULT 1,
    "erro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salas" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios_atendimento" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horaInicioMinutos" INTEGER NOT NULL,
    "horaFimMinutos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "horarios_atendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueios" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT,
    "salaId" TEXT,
    "tipo" "TipoBloqueio" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataHoraInicio" TIMESTAMP(3) NOT NULL,
    "dataHoraFim" TIMESTAMP(3) NOT NULL,
    "diaInteiro" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bloqueios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinicas_cnpj_key" ON "clinicas"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_medicoId_key" ON "usuarios"("medicoId");

-- CreateIndex
CREATE INDEX "usuarios_clinicaId_idx" ON "usuarios"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_clinicaId_email_key" ON "usuarios"("clinicaId", "email");

-- CreateIndex
CREATE INDEX "medicos_clinicaId_idx" ON "medicos"("clinicaId");

-- CreateIndex
CREATE INDEX "tipos_consulta_clinicaId_idx" ON "tipos_consulta"("clinicaId");

-- CreateIndex
CREATE INDEX "pacientes_clinicaId_idx" ON "pacientes"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_clinicaId_telefone_key" ON "pacientes"("clinicaId", "telefone");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_clinicaId_cpf_key" ON "pacientes"("clinicaId", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "consultas_remarcadaDeId_key" ON "consultas"("remarcadaDeId");

-- CreateIndex
CREATE INDEX "consultas_clinicaId_idx" ON "consultas"("clinicaId");

-- CreateIndex
CREATE INDEX "consultas_medicoId_dataHoraInicio_idx" ON "consultas"("medicoId", "dataHoraInicio");

-- CreateIndex
CREATE INDEX "consultas_pacienteId_idx" ON "consultas"("pacienteId");

-- CreateIndex
CREATE INDEX "consultas_status_idx" ON "consultas"("status");

-- CreateIndex
CREATE INDEX "fila_de_espera_clinicaId_idx" ON "fila_de_espera"("clinicaId");

-- CreateIndex
CREATE INDEX "fila_de_espera_medicoId_status_idx" ON "fila_de_espera"("medicoId", "status");

-- CreateIndex
CREATE INDEX "fila_de_espera_pacienteId_idx" ON "fila_de_espera"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_whatsappMessageId_key" ON "notificacoes"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "notificacoes_clinicaId_idx" ON "notificacoes"("clinicaId");

-- CreateIndex
CREATE INDEX "notificacoes_consultaId_idx" ON "notificacoes"("consultaId");

-- CreateIndex
CREATE INDEX "notificacoes_pacienteId_idx" ON "notificacoes"("pacienteId");

-- CreateIndex
CREATE INDEX "notificacoes_status_agendadaPara_idx" ON "notificacoes"("status", "agendadaPara");

-- CreateIndex
CREATE INDEX "salas_clinicaId_idx" ON "salas"("clinicaId");

-- CreateIndex
CREATE UNIQUE INDEX "salas_clinicaId_nome_key" ON "salas"("clinicaId", "nome");

-- CreateIndex
CREATE INDEX "horarios_atendimento_clinicaId_idx" ON "horarios_atendimento"("clinicaId");

-- CreateIndex
CREATE INDEX "horarios_atendimento_medicoId_diaSemana_idx" ON "horarios_atendimento"("medicoId", "diaSemana");

-- CreateIndex
CREATE INDEX "bloqueios_clinicaId_idx" ON "bloqueios"("clinicaId");

-- CreateIndex
CREATE INDEX "bloqueios_medicoId_dataHoraInicio_idx" ON "bloqueios"("medicoId", "dataHoraInicio");

-- CreateIndex
CREATE INDEX "bloqueios_salaId_idx" ON "bloqueios"("salaId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_consulta" ADD CONSTRAINT "tipos_consulta_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_consulta" ADD CONSTRAINT "tipos_consulta_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_medicoHabitualId_fkey" FOREIGN KEY ("medicoHabitualId") REFERENCES "medicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_tipoConsultaId_fkey" FOREIGN KEY ("tipoConsultaId") REFERENCES "tipos_consulta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "salas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_remarcadaDeId_fkey" FOREIGN KEY ("remarcadaDeId") REFERENCES "consultas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_consultaOrigemId_fkey" FOREIGN KEY ("consultaOrigemId") REFERENCES "consultas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_de_espera" ADD CONSTRAINT "fila_de_espera_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_de_espera" ADD CONSTRAINT "fila_de_espera_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_de_espera" ADD CONSTRAINT "fila_de_espera_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fila_de_espera" ADD CONSTRAINT "fila_de_espera_consultaVagaId_fkey" FOREIGN KEY ("consultaVagaId") REFERENCES "consultas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "consultas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salas" ADD CONSTRAINT "salas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios_atendimento" ADD CONSTRAINT "horarios_atendimento_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios_atendimento" ADD CONSTRAINT "horarios_atendimento_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "salas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
