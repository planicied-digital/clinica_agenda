import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Consulta } from '../api/types';
import { hoje, somarDias, formatarData, formatarHora } from '../utils/data';
import { STATUS_LABEL } from '../utils/status';

type Periodo = 'hoje' | 'semana';

const DIAS_PROXIMOS = 6;

export function AgendaMedico({ medicoId }: { medicoId: string }) {
  const { sessao } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!sessao) return;
    setCarregando(true);
    setErro(null);
    const query =
      periodo === 'hoje'
        ? `data=${hoje()}`
        : `dataInicio=${hoje()}&dataFim=${somarDias(hoje(), DIAS_PROXIMOS)}`;

    api
      .get<Consulta[]>(`/consultas?clinicaId=${sessao.usuario.clinicaId}&medicoId=${medicoId}&${query}`, sessao.accessToken)
      .then(setConsultas)
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Falha ao carregar a agenda.'))
      .finally(() => setCarregando(false));
  }, [sessao, medicoId, periodo]);

  const pacientesRecentes = Array.from(
    consultas
      .reduce((mapa, c) => {
        const atual = mapa.get(c.paciente.id);
        if (!atual || atual.dataHoraInicio < c.dataHoraInicio) {
          mapa.set(c.paciente.id, c);
        }
        return mapa;
      }, new Map<string, Consulta>())
      .values(),
  ).sort((a, b) => b.dataHoraInicio.localeCompare(a.dataHoraInicio));

  return (
    <div>
      <div className="abas abas-secundarias">
        <button className={periodo === 'hoje' ? 'aba-ativa' : ''} onClick={() => setPeriodo('hoje')}>
          Hoje
        </button>
        <button className={periodo === 'semana' ? 'aba-ativa' : ''} onClick={() => setPeriodo('semana')}>
          Próximos 7 dias
        </button>
      </div>

      {erro && <div className="mensagem-erro">{erro}</div>}

      {carregando ? (
        <p className="texto-suave">Carregando agenda…</p>
      ) : consultas.length === 0 ? (
        <p className="texto-suave">Nenhuma consulta no período.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              {periodo === 'semana' && <th>Data</th>}
              <th>Horário</th>
              <th>Paciente</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {consultas.map((c) => (
              <tr key={c.id}>
                {periodo === 'semana' && <td>{formatarData(c.dataHoraInicio)}</td>}
                <td>{formatarHora(c.dataHoraInicio)}</td>
                <td>{c.paciente.nome}</td>
                <td>
                  <span className={`badge badge-${c.status.toLowerCase()}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pacientesRecentes.length > 0 && (
        <div className="secao-pacientes-recentes">
          <h3>Pacientes no período</h3>
          <ul className="lista-simples">
            {pacientesRecentes.map((c) => (
              <li key={c.paciente.id}>
                {c.paciente.nome} <span className="texto-suave">— {formatarData(c.dataHoraInicio)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
