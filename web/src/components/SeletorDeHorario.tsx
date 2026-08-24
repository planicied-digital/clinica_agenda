import type { SlotDisponivel } from '../api/types';
import { formatarHora } from '../utils/data';

interface SeletorDeHorarioProps {
  horarios: SlotDisponivel[] | null;
  carregando: boolean;
  selecionado: SlotDisponivel | null;
  onSelecionar: (slot: SlotDisponivel) => void;
}

export function SeletorDeHorario({ horarios, carregando, selecionado, onSelecionar }: SeletorDeHorarioProps) {
  if (carregando) {
    return <p className="texto-suave">Carregando horários…</p>;
  }
  if (!horarios || horarios.length === 0) {
    return <p className="texto-suave">Nenhum horário disponível nessa data.</p>;
  }

  return (
    <div className="grade-horarios">
      {horarios.map((h) => (
        <button
          key={h.inicio}
          type="button"
          className={selecionado?.inicio === h.inicio ? 'botao-horario horario-selecionado' : 'botao-horario'}
          onClick={() => onSelecionar(h)}
        >
          {formatarHora(h.inicio)}
        </button>
      ))}
    </div>
  );
}
