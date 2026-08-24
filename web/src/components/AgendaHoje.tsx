import { Fragment, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Consulta } from '../api/types';
import { hoje, formatarHora } from '../utils/data';
import { STATUS_LABEL, STATUS_CONFIRMAVEIS, STATUS_FINALIZADOS } from '../utils/status';
import { PainelRemarcarConsulta } from './PainelRemarcarConsulta';
import { PainelEditarConsulta } from './PainelEditarConsulta';

type PainelAberto = { consultaId: string; modo: 'remarcar' | 'editar' } | null;

export function AgendaHoje() {
  const { sessao } = useAuth();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoEmAndamentoId, setAcaoEmAndamentoId] = useState<string | null>(null);
  const [painelAberto, setPainelAberto] = useState<PainelAberto>(null);

  const carregar = useCallback(async () => {
    if (!sessao) return;
    setErro(null);
    try {
      const dados = await api.get<Consulta[]>(
        `/consultas?clinicaId=${sessao.usuario.clinicaId}&data=${hoje()}`,
        sessao.accessToken,
      );
      setConsultas(dados);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao carregar a agenda de hoje.');
    } finally {
      setCarregando(false);
    }
  }, [sessao]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executarAcao(id: string, acao: 'confirmar' | 'cancelar') {
    if (!sessao) return;
    setAcaoEmAndamentoId(id);
    try {
      const corpo = acao === 'cancelar' ? { motivo: 'Cancelado pela secretária no painel' } : {};
      await api.post(`/consultas/${id}/${acao}`, corpo, sessao.accessToken);
      await carregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : `Falha ao ${acao} a consulta.`);
    } finally {
      setAcaoEmAndamentoId(null);
    }
  }

  function alternarPainel(consultaId: string, modo: 'remarcar' | 'editar') {
    setPainelAberto((atual) =>
      atual?.consultaId === consultaId && atual.modo === modo ? null : { consultaId, modo },
    );
  }

  async function aoConcluirPainel() {
    setPainelAberto(null);
    await carregar();
  }

  if (carregando) return <p className="texto-suave">Carregando agenda…</p>;

  return (
    <div>
      {erro && <div className="mensagem-erro">{erro}</div>}

      {consultas.length === 0 ? (
        <p className="texto-suave">Nenhuma consulta para hoje.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Horário</th>
              <th>Paciente</th>
              <th>Médico</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {consultas.map((c) => (
              <Fragment key={c.id}>
                <tr>
                  <td>{formatarHora(c.dataHoraInicio)}</td>
                  <td>
                    {c.paciente.nome}
                    {!c.paciente.temWhatsapp && <span className="etiqueta-alerta"> sem WhatsApp</span>}
                  </td>
                  <td>{c.medico.nome}</td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="celula-acoes">
                    <button
                      disabled={!STATUS_CONFIRMAVEIS.has(c.status) || acaoEmAndamentoId === c.id}
                      onClick={() => executarAcao(c.id, 'confirmar')}
                    >
                      Confirmar
                    </button>
                    <button
                      className="botao-secundario"
                      disabled={STATUS_FINALIZADOS.has(c.status) || acaoEmAndamentoId === c.id}
                      onClick={() => executarAcao(c.id, 'cancelar')}
                    >
                      Cancelar
                    </button>
                    <button
                      className="botao-secundario"
                      disabled={STATUS_FINALIZADOS.has(c.status)}
                      onClick={() => alternarPainel(c.id, 'remarcar')}
                    >
                      Remarcar
                    </button>
                    <button
                      className="botao-secundario"
                      disabled={STATUS_FINALIZADOS.has(c.status)}
                      onClick={() => alternarPainel(c.id, 'editar')}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
                {painelAberto?.consultaId === c.id && (
                  <tr>
                    <td colSpan={5}>
                      {painelAberto.modo === 'remarcar' ? (
                        <PainelRemarcarConsulta
                          consulta={c}
                          onRemarcada={aoConcluirPainel}
                          onFechar={() => setPainelAberto(null)}
                        />
                      ) : (
                        <PainelEditarConsulta
                          consulta={c}
                          onSalva={aoConcluirPainel}
                          onFechar={() => setPainelAberto(null)}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
