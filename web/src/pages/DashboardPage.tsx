import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { AgendaHoje } from '../components/AgendaHoje';
import { Pendencias } from '../components/Pendencias';

type Aba = 'agenda' | 'pendencias';

export function DashboardPage() {
  const { sessao, logout } = useAuth();
  const [aba, setAba] = useState<Aba>('agenda');

  return (
    <div className="pagina-dashboard">
      <header className="cabecalho">
        <div>
          <strong>Planície Digital</strong>
          <span className="texto-suave"> — {sessao?.usuario.nome}</span>
        </div>
        <button className="botao-secundario" onClick={logout}>
          Sair
        </button>
      </header>

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
