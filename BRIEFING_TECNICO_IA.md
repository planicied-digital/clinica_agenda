# Briefing Técnico — Plataforma de Agendamento para Consultórios Médicos

> Este documento consolida o planejamento de produto já feito e serve como ponto de partida para a implementação assistida por IA (ex.: Claude Code). Contém contexto, escopo, workflow, regras de negócio e a pilha de tecnologia recomendada.

## 1. Contexto e objetivo

Software para consultórios médicos que assume a gestão de marcação, confirmação, cancelamento e remarcação de consultas, para que a secretária não precise fazer isso manualmente na maior parte dos casos. O sistema envia confirmações e lembretes automáticos, processa as respostas do paciente e só devolve o caso para uma pessoa quando exige julgamento humano (remarcação complexa, paciente que não responde, ou paciente sem WhatsApp).

## 2. Escopo do MVP

- **B2B, uma clínica por vez.** O sistema atende a agenda de uma clínica/consultório específico. Não é um marketplace onde o paciente escolhe entre vários hospitais/clínicas (esse modelo foi considerado e descartado para o MVP — pode voltar como fase futura).
- **Canal de notificação automatizado: somente WhatsApp.** Não há ligação automática/URA. Paciente sem WhatsApp é sinalizado no painel e contatado manualmente pela secretária, por telefone comum.
- **Sem aplicativo nativo para o paciente no início.** A interação do paciente é via WhatsApp; um site simples (PWA) pode ser considerado no futuro.

## 3. Módulos do sistema

1. **Cadastro de clínica e médicos** — especialidades, horários de atendimento, duração padrão por tipo de consulta, bloqueios e feriados.
2. **Cadastro de pacientes** — dados de contato, histórico de consultas, indicação de disponibilidade de WhatsApp, observações administrativas.
3. **Agenda / calendário** — visão por médico e por sala, encaixes, regras de disponibilidade e conflitos de horário.
4. **Motor de notificações via WhatsApp** — confirmações, lembretes configuráveis (ex.: 48h e 2h antes), escalonamento por falta de resposta.
5. **Fila de espera** — reaproveita automaticamente vagas canceladas, notificando pacientes interessados naquele horário.
6. **Painel da secretária** — visão do dia, pendências que exigem contato manual (paciente sem WhatsApp, sem resposta após 2 tentativas), histórico de confirmações.
7. **Painel do médico** — agenda do dia/semana, taxa de comparecimento, histórico simplificado de pacientes.
8. **Relatórios** — taxa de no-show, taxa de confirmação, tempo médio de resposta ao lembrete.

## 4. Workflow — visão geral (ponta a ponta)

1. Paciente solicita consulta (site/app/WhatsApp/secretária) → sistema consulta disponibilidade real da agenda do médico → horário reservado.
2. Sistema verifica se o paciente tem WhatsApp cadastrado:
   - **Sim** → confirmação automática via WhatsApp → entra na régua de lembretes automáticos.
   - **Não** → sistema sinaliza a secretária → ela confirma por telefone e acompanha esse paciente manualmente até o dia da consulta (fora do fluxo automatizado).
3. No horário do lembrete, o paciente pode: confirmar, cancelar, pedir para remarcar, ou não responder.
   - **Confirma** → consulta mantida.
   - **Cancela** → vaga liberada → sistema aciona a fila de espera (notifica o 1º da lista; se não aceitar a tempo, notifica o próximo; se ninguém aceitar, horário volta a ficar disponível para novas marcações).
   - **Quer remarcar** → bot oferece novos horários (ou transfere para a secretária) → novo horário reservado → horário antigo também é liberado (mesma lógica da fila de espera).
   - **Não responde** → 2º lembrete mais próximo da consulta → se ainda não responder, secretária tenta contato manual → se não conseguir, é tratado como **desistência** (cancelamento automático por inatividade, mesma lógica de liberação de vaga acima).
4. No dia da consulta: se o paciente não comparecer, é registrado como no-show e o sistema sugere remarcação automaticamente.

## 5. Roteiros de recepção da solicitação

O que muda entre os três cenários abaixo é **apenas a etapa inicial** — todos convergem para o mesmo motor de agenda e a mesma régua de notificações descrita na seção 4.

**Paciente novo (primeira consulta):** canal de entrada → sistema não encontra o telefone/CPF na base → coleta dados essenciais (nome, nascimento, telefone, convênio, motivo/especialidade) → abre cadastro mínimo (resto é completado na recepção física) → consulta disponibilidade → paciente escolhe horário → confirmação com instruções de primeira visita → registra se tem WhatsApp → entra na régua padrão.

**Paciente antigo (marcação espontânea):** canal de entrada → sistema reconhece automaticamente pelo telefone/CPF (traz histórico e médico habitual) → confirma preferência de médico → consulta disponibilidade → confirmação rápida de dados cadastrais (só o que pode ter mudado) → confirmação enviada → entra na régua padrão.

**Retorno na saída da consulta:** ao final do atendimento, o médico registra a necessidade de retorno e o prazo recomendado (ex.: 15–20 dias) → sistema gera uma janela de datas cruzada com a agenda real → oferece horários dentro dessa janela antes do paciente sair da clínica → parte das vagas do médico fica reservada para retornos (prioridade de agenda) → confirmação idealmente feita no ato; se o paciente preferir decidir depois, sistema dispara lembrete próximo do fim da janela → se não houver vaga na janela recomendada, paciente entra na fila de espera prioritária desse médico para o período, e a secretária é avisada para acompanhar.

## 6. Regras de negócio específicas a implementar

- Régua de lembretes configurável por clínica (padrão sugerido: 48h e 2h antes).
- Escalonamento por não resposta: 2º lembrete → alerta para secretária → desistência por inatividade se a secretária não conseguir contato.
- Fila de espera: notificação sequencial (1º da fila → próximo se recusar/não responder a tempo → horário aberto se a fila esgotar).
- Retorno: reserva de parte da agenda do médico para consultas de retorno dentro da janela clínica recomendada.
- Paciente sem WhatsApp: fluxo 100% manual pela secretária, sem nenhuma automação de voz.

## 7. Pilha de tecnologia recomendada

- **Back-end:** Node.js com NestJS (alternativa: Python/Django). Justificativa: o sistema é orientado a eventos (webhooks do WhatsApp, respostas de botão, lembretes agendados), e isso pede um modelo assíncrono robusto.
- **Banco de dados:** PostgreSQL para agenda, cadastros e histórico (dado relacional, precisa de consistência forte).
- **Filas/jobs:** Redis + BullMQ para agendar lembretes, controlar retries e escalonamentos sem depender de cron manual.
- **Front-end:** React/Next.js para os painéis da secretária e do médico, com atualização em tempo real via WebSocket.
- **Canal do paciente:** WhatsApp como interface principal — Cloud API oficial da Meta (mais barata, mais trabalho de integração) ou um BSP como 360dialog (mais pronto, com suporte).
- **Hospedagem:** nuvem com dados armazenados no Brasil (ex.: AWS São Paulo), por latência e por conformidade com a LGPD.
- **Arquitetura:** monólito modular no MVP — mais rápido de construir e mais barato de operar; extrair serviços independentes só se o volume justificar depois.

## 8. Requisitos não funcionais

- **LGPD:** dado de saúde tramitando e armazenado no Brasil; controle de acesso por papel (secretária, médico, admin); trilha de auditoria de alterações na agenda.
- **Confiabilidade das notificações:** idempotência no processamento de webhooks do WhatsApp, retries com backoff, e visibilidade no painel de tudo que falhou ou está pendente de contato manual.

## 9. Fora de escopo no MVP (decisões já tomadas, não revisitar sem necessidade)

- Marketplace multi-clínica / multi-hospital (paciente escolhendo entre vários provedores).
- Ligação automática / URA para pacientes sem WhatsApp.
- Aplicativo nativo para o paciente.
- Módulo financeiro/cobrança (não discutido ainda — avaliar se entra no MVP ou depois).

## 10. Sugestão de primeiros passos para a IA de implementação

1. Modelar as entidades principais: Clínica, Médico, Paciente, Consulta, FilaDeEspera, Notificação/Lembrete, Usuário (com papel: secretária/médico/admin).
2. Definir os endpoints da API para os fluxos da seção 4 (criar consulta, confirmar, cancelar, remarcar, entrar/sair da fila de espera).
3. Configurar o projeto base (NestJS + PostgreSQL + Redis) e a fila de jobs para a régua de lembretes.
4. Integrar a API do WhatsApp escolhida (Cloud API ou BSP) e implementar o webhook de recebimento de respostas.
5. Construir os painéis (secretária e médico) consumindo a API, com atualização em tempo real.
