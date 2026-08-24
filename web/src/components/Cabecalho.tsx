import { useAuth } from '../auth/AuthContext';

export function Cabecalho() {
  const { sessao, logout } = useAuth();
  return (
    <header className="cabecalho">
      <div>
        <strong>Planície Digital</strong>
        <span className="texto-suave"> — {sessao?.usuario.nome}</span>
      </div>
      <button className="botao-secundario" onClick={logout}>
        Sair
      </button>
    </header>
  );
}
