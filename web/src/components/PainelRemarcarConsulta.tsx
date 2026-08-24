import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Consulta, SlotDisponivel } from '../api/types';
import { hoje } from '../utils/data';
import { useDisponibilidade } from '../hooks/useDisponibilidade';
import { SeletorDeHorario } from './SeletorDeHorario';

function duracaoMinutos(consulta: Consulta): number {
  return Math.round((new Date(consulta.dataHoraFim).getTime() - new Date(consulta.dataHoraInicio).getTime()) / 60_000);
}

export function PainelRemarcarConsulta({
  consulta,
  onRemarcada,
  onFechar,
}: {
  consulta: Consulta;
  onRemarcada: () => void;
  onFechar: () => void;
}) {
  const { sessao } = useAuth();
  const [data, setData] = useState(hoje());
  const [horarioSelecionado, setHorarioSelecionado] = useState<SlotDisponivel | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { horarios, carregando, recarregar } = useDisponibilidade({
    medicoId: consulta.medico.id,
    data,
    tipoConsultaId: consulta.tipoConsulta?.id,
    duracaoMinutos: consulta.tipoConsulta ? undefined : duracaoMinutos(consulta),
  });

  async function confirmarRemarcacao() {
    if (!sessao || !horarioSelecionado) return;
    setEnviando(true);
    setErro(null);
    try {
      await api.post(
        `/consultas/${consulta.id}/remarcar`,
        { novaDataHoraInicio: horarioSelecionado.inicio, novaDataHoraFim: horarioSelecionado.fim },
        sessao.accessToken,
      );
      onRemarcada();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setErro('Esse horário acabou de ser ocupado por outra marcação. Escolha outro horário na lista abaixo.');
        setHorarioSelecionado(null);
        recarregar();
      } else {
        setErro(e instanceof ApiError ? e.message : 'Falha ao remarcar a consulta.');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="painel-inline">
      <label htmlFor={`remarcar-data-${consulta.id}`}>Nova data</label>
      <input
        id={`remarcar-data-${consulta.id}`}
        type="date"
        min={hoje()}
        value={data}
        onChange={(e) => {
          setData(e.target.value);
          setHorarioSelecionado(null);
        }}
      />

      <label>Novo horário</label>
      <SeletorDeHorario
        horarios={horarios}
        carregando={carregando}
        selecionado={horarioSelecionado}
        onSelecionar={setHorarioSelecionado}
      />

      {erro && <div className="mensagem-erro">{erro}</div>}

      <div className="celula-acoes">
        <button onClick={confirmarRemarcacao} disabled={!horarioSelecionado || enviando}>
          {enviando ? 'Remarcando…' : 'Confirmar remarcação'}
        </button>
        <button className="botao-secundario" onClick={onFechar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
