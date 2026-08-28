import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Consulta } from '../api/types';
import { hoje, formatarHora } from '../utils/data';
import { STATUS_LABEL, STATUS_CONFIRMAVEIS, STATUS_FINALIZADOS } from '../utils/status';
import { PainelRemarcarConsulta } from './PainelRemarcarConsulta';
import { PainelEditarConsulta } from './PainelEditarConsulta';

type PainelAberto = { consultaId: string; modo: 'remarcar' | 'editar' } | null;

export interface FocoAgenda {
  consultaId: string;
  data: string;
}

interface AgendaHojeProps {
  focoAgenda?: FocoAgenda | null;
  onFocoConsumido?: () => void;
}

export function AgendaHoje({ focoAgenda = null, onFocoConsumido }: AgendaHojeProps) {
  const { sessao } = useAuth();
  // Já nasce na data certa quando vem de uma pendência — se começasse em
  // hoje() e só depois trocasse pra focoAgenda.data, duas buscas ficariam em
  // voo ao mesmo tempo (a de hoje() e a da data certa), e não há garantia de
  // qual delas resolve por último: a errada podia sobrescrever consultas com
  // o dia errado bem na hora em que o efeito de abrir o painel checava a
  // lista, fazendo a consulta "sumir" mesmo já carregada corretamente logo
  // em seguida.
  const [data, setData] = useState(() => focoAgenda?.data ?? hoje());
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoEmAndamentoId, setAcaoEmAndamentoId] = useState<string | null>(null);
  const [painelAberto, setPainelAberto] = useState<PainelAberto>(null);
  const [linhaDestacada, setLinhaDestacada] = useState<string | null>(null);
  const linhasRef = useRef<Record<string, HTMLTableRowElement | null>>({});

  const carregar = useCallback(async () => {
    if (!sessao) return;
    setErro(null);
    setCarregando(true);
    try {
      const dados = await api.get<Consulta[]>(
        `/consultas?clinicaId=${sessao.usuario.clinicaId}&data=${data}`,
        sessao.accessToken,
      );
      setConsultas(dados);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao carregar a agenda desse dia.');
    } finally {
      setCarregando(false);
    }
  }, [sessao, data]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Trocar de dia invalida qualquer painel de remarcar/editar aberto — a
  // consulta que ele referenciava pode nem aparecer mais na lista nova.
  useEffect(() => {
    setPainelAberto(null);
  }, [data]);

  // Chegada de uma pendência (seção "Pendências") — leva a data pro dia da
  // consulta em questão. A abertura do painel só acontece depois, no efeito
  // seguinte, quando a lista daquele dia já tiver carregado.
  useEffect(() => {
    if (!focoAgenda) return;
    if (data !== focoAgenda.data) {
      setData(focoAgenda.data);
    }
  }, [focoAgenda, data]);

  useEffect(() => {
    if (!focoAgenda || carregando || data !== focoAgenda.data) return;
    const consultaAlvo = consultas.find((c) => c.id === focoAgenda.consultaId);
    if (consultaAlvo) {
      setPainelAberto({ consultaId: focoAgenda.consultaId, modo: 'editar' });
      setLinhaDestacada(focoAgenda.consultaId);
      linhasRef.current[focoAgenda.consultaId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setErro('A consulta dessa pendência não foi encontrada na agenda desse dia.');
    }
    onFocoConsumido?.();
  }, [focoAgenda, carregando, data, consultas, onFocoConsumido]);

  useEffect(() => {
    if (!linhaDestacada) return;
    const timeout = setTimeout(() => setLinhaDestacada(null), 2000);
    return () => clearTimeout(timeout);
  }, [linhaDestacada]);

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

  return (
    <div>
      <div className="linha-selecao-data">
        <label htmlFor="agenda-data">Data</label>
        <input id="agenda-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        {data !== hoje() && (
          <button className="botao-secundario" onClick={() => setData(hoje())}>
            Hoje
          </button>
        )}
      </div>

      {erro && <div className="mensagem-erro">{erro}</div>}

      {carregando ? (
        <p className="texto-suave">Carregando agenda…</p>
      ) : consultas.length === 0 ? (
        <p className="texto-suave">Nenhuma consulta nesse dia.</p>
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
                <tr
                  ref={(el) => {
                    linhasRef.current[c.id] = el;
                  }}
                  className={linhaDestacada === c.id ? 'linha-destacada' : undefined}
                >
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
