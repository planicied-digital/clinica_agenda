import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Notificacao } from '../api/types';
import { formatarDataHora } from '../utils/data';

export function Pendencias() {
  const { sessao } = useAuth();
  const [pendencias, setPendencias] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!sessao) return;
    api
      .get<Notificacao[]>(
        `/notificacoes?clinicaId=${sessao.usuario.clinicaId}&status=PENDENTE&tipo=ALERTA_SECRETARIA`,
        sessao.accessToken,
      )
      .then(setPendencias)
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Falha ao carregar pendências.'))
      .finally(() => setCarregando(false));
  }, [sessao]);

  if (carregando) return <p className="texto-suave">Carregando pendências…</p>;
  if (erro) return <div className="mensagem-erro">{erro}</div>;

  if (pendencias.length === 0) {
    return <p className="texto-suave">Nenhuma pendência de contato manual no momento.</p>;
  }

  return (
    <ul className="lista-pendencias">
      {pendencias.map((p) => (
        <li key={p.id} className="cartao-pendencia">
          <div className="pendencia-cabecalho">
            <strong>{p.paciente.nome}</strong>
            <span className="texto-suave">{formatarDataHora(p.agendadaPara)}</span>
          </div>
          <div className="texto-suave">{p.paciente.telefone}</div>
          <p>{p.detalhe ?? 'Requer contato manual.'}</p>
          {p.consulta && (
            <div className="texto-suave">Consulta: {formatarDataHora(p.consulta.dataHoraInicio)}</div>
          )}
        </li>
      ))}
    </ul>
  );
}
