import { useState } from 'react';
import { Cabecalho } from '../components/Cabecalho';
import { AgendaHoje } from '../components/AgendaHoje';
import type { FocoAgenda } from '../components/AgendaHoje';
import { Pendencias } from '../components/Pendencias';
import { NovaConsulta } from '../components/NovaConsulta';
import { HorariosAtendimento } from '../components/HorariosAtendimento';
import { chaveDia } from '../utils/data';

type Aba = 'agenda' | 'nova-consulta' | 'pendencias' | 'horarios';

export function DashboardPage() {
  const [aba, setAba] = useState<Aba>('agenda');
  const [focoAgenda, setFocoAgenda] = useState<FocoAgenda | null>(null);

  function abrirConsultaNaAgenda(consultaId: string, dataISO: string) {
    setFocoAgenda({ consultaId, data: chaveDia(dataISO) });
    setAba('agenda');
  }

  return (
    <div className="pagina-dashboard">
      <Cabecalho />

      <nav className="abas">
        <button className={aba === 'agenda' ? 'aba-ativa' : ''} onClick={() => setAba('agenda')}>
          Agenda
        </button>
        <button className={aba === 'nova-consulta' ? 'aba-ativa' : ''} onClick={() => setAba('nova-consulta')}>
          Nova consulta
        </button>
        <button className={aba === 'pendencias' ? 'aba-ativa' : ''} onClick={() => setAba('pendencias')}>
          Pendências
        </button>
        <button className={aba === 'horarios' ? 'aba-ativa' : ''} onClick={() => setAba('horarios')}>
          Horários de atendimento
        </button>
      </nav>

      <main className="conteudo">
        {aba === 'agenda' && (
          <AgendaHoje focoAgenda={focoAgenda} onFocoConsumido={() => setFocoAgenda(null)} />
        )}
        {aba === 'nova-consulta' && <NovaConsulta onCriada={() => setAba('agenda')} />}
        {aba === 'pendencias' && <Pendencias onAbrirConsulta={abrirConsultaNaAgenda} />}
        {aba === 'horarios' && <HorariosAtendimento />}
      </main>
    </div>
  );
}
