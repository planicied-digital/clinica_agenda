import { useState } from 'react';
import { Cabecalho } from '../components/Cabecalho';
import { AgendaHoje } from '../components/AgendaHoje';
import { Pendencias } from '../components/Pendencias';

type Aba = 'agenda' | 'pendencias';

export function DashboardPage() {
  const [aba, setAba] = useState<Aba>('agenda');

  return (
    <div className="pagina-dashboard">
      <Cabecalho />

      <nav className="abas">
        <button className={aba === 'agenda' ? 'aba-ativa' : ''} onClick={() => setAba('agenda')}>
          Agenda de hoje
        </button>
        <button className={aba === 'pendencias' ? 'aba-ativa' : ''} onClick={() => setAba('pendencias')}>
          Pendências
        </button>
      </nav>

      <main className="conteudo">{aba === 'agenda' ? <AgendaHoje /> : <Pendencias />}</main>
    </div>
  );
}
