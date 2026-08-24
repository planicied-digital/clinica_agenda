export type PapelUsuario = 'ADMIN' | 'SECRETARIA' | 'MEDICO';

export type StatusConsulta =
  | 'SOLICITADA'
  | 'AGUARDANDO_CONFIRMACAO'
  | 'CONFIRMADA'
  | 'CANCELADA'
  | 'REMARCADA'
  | 'REALIZADA'
  | 'NAO_COMPARECEU';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  clinicaId: string;
  medicoId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  usuario: Usuario;
}

export interface Paciente {
  id: string;
  nome: string;
  telefone: string;
  temWhatsapp: boolean;
  // Presente na busca por contato (seção 5 — "paciente antigo") e usado pra
  // pré-selecionar o médico no formulário de nova consulta.
  medicoHabitualId?: string | null;
}

export interface Medico {
  id: string;
  nome: string;
  especialidade: string;
}

export interface TipoConsulta {
  id: string;
  nome: string;
  duracaoMinutos: number;
  medicoId: string | null;
}

export interface Sala {
  id: string;
  nome: string;
}

export interface SlotDisponivel {
  inicio: string;
  fim: string;
}

export interface Consulta {
  id: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  status: StatusConsulta;
  motivo: string | null;
  paciente: Paciente;
  medico: Medico;
}

export interface Notificacao {
  id: string;
  tipo: string;
  status: string;
  detalhe: string | null;
  agendadaPara: string;
  paciente: Paciente;
  consulta: Pick<Consulta, 'id' | 'dataHoraInicio' | 'status'> | null;
}
