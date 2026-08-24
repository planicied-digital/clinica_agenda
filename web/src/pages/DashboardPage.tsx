import { useState } from 'react';
import { Cabecalho } from '../components/Cabecalho';
import { AgendaHoje } from '../components/AgendaHoje';
import { Pendencias } from '../components/Pendencias';
import { NovaConsulta } from '../components/NovaConsulta';

type Aba = 'agenda' | 'nova-consulta' | 'pendencias';

export function DashboardPage() {
  const [aba, setAba] = useState<Aba>('agenda');

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
      </nav>

      <main className="conteudo">
        {aba === 'agenda' && <AgendaHoje />}
        {aba === 'nova-consulta' && <NovaConsulta onCriada={() => setAba('agenda')} />}
        {aba === 'pendencias' && <Pendencias />}
      </main>
    </div>
  );
}
