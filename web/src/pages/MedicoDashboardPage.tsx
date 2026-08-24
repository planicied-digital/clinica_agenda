import { useAuth } from '../auth/AuthContext';
import { Cabecalho } from '../components/Cabecalho';
import { TaxaComparecimento } from '../components/TaxaComparecimento';
import { AgendaMedico } from '../components/AgendaMedico';

export function MedicoDashboardPage() {
  const { sessao } = useAuth();
  const medicoId = sessao?.usuario.medicoId;

  return (
    <div className="pagina-dashboard">
      <Cabecalho />

      {!medicoId ? (
        <div className="mensagem-erro">Este usuário não está vinculado a um médico. Peça para o administrador ajustar o cadastro.</div>
      ) : (
        <>
          <TaxaComparecimento medicoId={medicoId} />
          <main className="conteudo conteudo-com-margem">
            <AgendaMedico medicoId={medicoId} />
          </main>
        </>
      )}
    </div>
  );
}
