function paraChaveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function hoje(): string {
  return paraChaveDia(new Date());
}

export function chaveDia(iso: string): string {
  return paraChaveDia(new Date(iso));
}

export function somarDias(chaveDia: string, dias: number): string {
  const d = new Date(`${chaveDia}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return paraChaveDia(d);
}

export function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
