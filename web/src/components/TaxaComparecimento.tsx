import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Consulta } from '../api/types';
import { hoje, somarDias } from '../utils/data';

const JANELA_DIAS = 30;

export function TaxaComparecimento({ medicoId }: { medicoId: string }) {
  const { sessao } = useAuth();
  const [consultas, setConsultas] = useState<Consulta[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!sessao) return;
    const dataInicio = somarDias(hoje(), -JANELA_DIAS);
    api
      .get<Consulta[]>(
        `/consultas?clinicaId=${sessao.usuario.clinicaId}&medicoId=${medicoId}&dataInicio=${dataInicio}&dataFim=${hoje()}`,
        sessao.accessToken,
      )
      .then(setConsultas)
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Falha ao carregar a taxa de comparecimento.'));
  }, [sessao, medicoId]);

  if (erro) return <div className="mensagem-erro">{erro}</div>;
  if (!consultas) return <p className="texto-suave">Calculando…</p>;

  const realizadas = consultas.filter((c) => c.status === 'REALIZADA').length;
  const faltas = consultas.filter((c) => c.status === 'NAO_COMPARECEU').length;
  const total = realizadas + faltas;
  const taxa = total > 0 ? Math.round((realizadas / total) * 100) : null;

  return (
    <div className="cartao-estatistica">
      <span className="texto-suave">Taxa de comparecimento (últimos {JANELA_DIAS} dias)</span>
      <strong className="valor-estatistica">{taxa === null ? '—' : `${taxa}%`}</strong>
      <span className="texto-suave">
        {total === 0 ? 'Sem consultas concluídas no período.' : `${realizadas} compareceram, ${faltas} faltaram`}
      </span>
    </div>
  );
}
