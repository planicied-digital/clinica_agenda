// Formatação pt-BR usada nas mensagens de WhatsApp. Assume que o servidor
// roda no timezone da clínica (mesma premissa já documentada em
// ConsultasService.disponibilidade — MVP de região única, seção 7).
export function formatarDataHora(data: Date): string {
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
