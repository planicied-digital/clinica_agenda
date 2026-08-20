// Normaliza telefone para apenas dígitos, para que o cadastro feito pela
// secretária (com máscara/formatação livre) e o número recebido do webhook
// do WhatsApp (sempre dígitos) sejam comparáveis.
export function normalizarTelefone(valor: string): string {
  return valor.replace(/\D/g, '');
}
