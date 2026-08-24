export const STATUS_LABEL: Record<string, string> = {
  SOLICITADA: 'Solicitada',
  AGUARDANDO_CONFIRMACAO: 'Aguardando confirmação',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  REMARCADA: 'Remarcada',
  REALIZADA: 'Realizada',
  NAO_COMPARECEU: 'Não compareceu',
};

export const STATUS_CONFIRMAVEIS = new Set(['SOLICITADA', 'AGUARDANDO_CONFIRMACAO']);
export const STATUS_FINALIZADOS = new Set(['CANCELADA', 'REALIZADA', 'NAO_COMPARECEU', 'REMARCADA']);
