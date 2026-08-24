import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Medico, Paciente, Sala, SlotDisponivel, TipoConsulta } from '../api/types';
import { hoje, formatarHora } from '../utils/data';

interface NovoPacienteForm {
  nome: string;
  dataNascimento: string;
  convenio: string;
  temWhatsapp: boolean;
}

const NOVO_PACIENTE_VAZIO: NovoPacienteForm = { nome: '', dataNascimento: '', convenio: '', temWhatsapp: true };

export function NovaConsulta({ onCriada }: { onCriada: () => void }) {
  const { sessao } = useAuth();
  const clinicaId = sessao!.usuario.clinicaId;

  // Passo 1 — busca/cadastro do paciente.
  const [contato, setContato] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [novoPaciente, setNovoPaciente] = useState<NovoPacienteForm>(NOVO_PACIENTE_VAZIO);
  const [cadastrando, setCadastrando] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);

  // Passo 2 em diante.
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [medicoId, setMedicoId] = useState('');
  const [tiposConsulta, setTiposConsulta] = useState<TipoConsulta[]>([]);
  const [tipoConsultaId, setTipoConsultaId] = useState('');
  const [data, setData] = useState(hoje());
  const [salas, setSalas] = useState<Sala[]>([]);
  const [salaId, setSalaId] = useState('');
  const [horarios, setHorarios] = useState<SlotDisponivel[] | null>(null);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [horarioSelecionado, setHorarioSelecionado] = useState<SlotDisponivel | null>(null);
  const [motivo, setMotivo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Médicos e salas não dependem de nada além da clínica — carrega uma vez.
  useEffect(() => {
    if (!sessao) return;
    api.get<Medico[]>(`/medicos?clinicaId=${clinicaId}&ativo=true`, sessao.accessToken).then(setMedicos).catch(() => {});
    api.get<Sala[]>(`/salas?clinicaId=${clinicaId}`, sessao.accessToken).then(setSalas).catch(() => {});
  }, [sessao, clinicaId]);

  // Paciente antigo com médico habitual (seção 5) — pré-seleciona assim que
  // souber quem é e a lista de médicos já tiver carregado.
  useEffect(() => {
    if (paciente?.medicoHabitualId) {
      setMedicoId(paciente.medicoHabitualId);
    }
  }, [paciente]);

  useEffect(() => {
    if (!sessao || !medicoId) {
      setTiposConsulta([]);
      setTipoConsultaId('');
      return;
    }
    api
      .get<TipoConsulta[]>(`/tipos-consulta?clinicaId=${clinicaId}&medicoId=${medicoId}`, sessao.accessToken)
      .then(setTiposConsulta)
      .catch(() => setTiposConsulta([]));
    setTipoConsultaId('');
    setHorarios(null);
    setHorarioSelecionado(null);
  }, [sessao, clinicaId, medicoId]);

  useEffect(() => {
    setHorarioSelecionado(null);
    if (!sessao || !medicoId || !tipoConsultaId || !data) {
      setHorarios(null);
      return;
    }
    setCarregandoHorarios(true);
    api
      .get<SlotDisponivel[]>(
        `/consultas/disponibilidade?medicoId=${medicoId}&tipoConsultaId=${tipoConsultaId}&data=${data}`,
        sessao.accessToken,
      )
      .then(setHorarios)
      .catch(() => setHorarios([]))
      .finally(() => setCarregandoHorarios(false));
  }, [sessao, medicoId, tipoConsultaId, data]);

  async function buscarPaciente() {
    if (!sessao || !contato.trim()) return;
    setBuscando(true);
    setErroBusca(null);
    setNaoEncontrado(false);
    try {
      const encontrado = await api.get<Paciente | null>(
        `/pacientes/buscar?clinicaId=${clinicaId}&telefone=${encodeURIComponent(contato)}&cpf=${encodeURIComponent(contato)}`,
        sessao.accessToken,
      );
      if (encontrado) {
        setPaciente(encontrado);
      } else {
        setNaoEncontrado(true);
        setNovoPaciente({ ...NOVO_PACIENTE_VAZIO });
      }
    } catch (e) {
      setErroBusca(e instanceof ApiError ? e.message : 'Falha ao buscar paciente.');
    } finally {
      setBuscando(false);
    }
  }

  async function cadastrarPaciente() {
    if (!sessao || !novoPaciente.nome.trim()) return;
    setCadastrando(true);
    setErroCadastro(null);
    try {
      const criado = await api.post<Paciente>(
        '/pacientes',
        {
          clinicaId,
          nome: novoPaciente.nome,
          telefone: contato,
          dataNascimento: novoPaciente.dataNascimento || undefined,
          convenio: novoPaciente.convenio || undefined,
          temWhatsapp: novoPaciente.temWhatsapp,
        },
        sessao.accessToken,
      );
      setPaciente(criado);
      setNaoEncontrado(false);
    } catch (e) {
      setErroCadastro(e instanceof ApiError ? e.message : 'Falha ao cadastrar paciente.');
    } finally {
      setCadastrando(false);
    }
  }

  function trocarPaciente() {
    setPaciente(null);
    setContato('');
    setNaoEncontrado(false);
    setMedicoId('');
  }

  async function confirmarAgendamento() {
    if (!sessao || !paciente || !medicoId || !tipoConsultaId || !horarioSelecionado) return;
    setEnviando(true);
    setErroEnvio(null);
    try {
      await api.post(
        '/consultas',
        {
          clinicaId,
          medicoId,
          pacienteId: paciente.id,
          tipoConsultaId,
          salaId: salaId || undefined,
          dataHoraInicio: horarioSelecionado.inicio,
          dataHoraFim: horarioSelecionado.fim,
          origem: 'SECRETARIA',
          motivo: motivo || undefined,
          observacoes: observacoes || undefined,
        },
        sessao.accessToken,
      );
      setSucesso(true);
      setTimeout(onCriada, 1200);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setErroEnvio('Esse horário acabou de ser ocupado por outra marcação. Escolha outro horário na lista abaixo.');
        setHorarioSelecionado(null);
        api
          .get<SlotDisponivel[]>(
            `/consultas/disponibilidade?medicoId=${medicoId}&tipoConsultaId=${tipoConsultaId}&data=${data}`,
            sessao.accessToken,
          )
          .then(setHorarios)
          .catch(() => setHorarios([]));
      } else {
        setErroEnvio(e instanceof ApiError ? e.message : 'Falha ao criar a consulta.');
      }
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return <div className="mensagem-sucesso">Consulta agendada com sucesso — voltando pra agenda de hoje…</div>;
  }

  return (
    <div className="form-nova-consulta">
      {!paciente ? (
        <div className="secao-form">
          <label htmlFor="contato">Telefone ou CPF do paciente</label>
          <div className="linha-busca">
            <input
              id="contato"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="Ex.: 5595991234567"
            />
            <button onClick={buscarPaciente} disabled={buscando || !contato.trim()}>
              {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
          {erroBusca && <div className="mensagem-erro">{erroBusca}</div>}

          {naoEncontrado && (
            <div className="cartao-cadastro-rapido">
              <p className="texto-suave">Nenhum paciente encontrado com esse contato — cadastre um novo:</p>

              <label htmlFor="novoNome">Nome</label>
              <input
                id="novoNome"
                value={novoPaciente.nome}
                onChange={(e) => setNovoPaciente({ ...novoPaciente, nome: e.target.value })}
              />

              <label htmlFor="novoNascimento">Data de nascimento (opcional)</label>
              <input
                id="novoNascimento"
                type="date"
                value={novoPaciente.dataNascimento}
                onChange={(e) => setNovoPaciente({ ...novoPaciente, dataNascimento: e.target.value })}
              />

              <label htmlFor="novoConvenio">Convênio (opcional)</label>
              <input
                id="novoConvenio"
                value={novoPaciente.convenio}
                onChange={(e) => setNovoPaciente({ ...novoPaciente, convenio: e.target.value })}
              />

              <label className="linha-checkbox">
                <input
                  type="checkbox"
                  checked={novoPaciente.temWhatsapp}
                  onChange={(e) => setNovoPaciente({ ...novoPaciente, temWhatsapp: e.target.checked })}
                />
                Paciente tem WhatsApp
              </label>

              {erroCadastro && <div className="mensagem-erro">{erroCadastro}</div>}

              <button onClick={cadastrarPaciente} disabled={cadastrando || !novoPaciente.nome.trim()}>
                {cadastrando ? 'Cadastrando…' : 'Cadastrar e continuar'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="linha-paciente-selecionado">
            <span>
              <strong>{paciente.nome}</strong>{' '}
              <span className="texto-suave">
                — {paciente.telefone}
                {!paciente.temWhatsapp && ' — sem WhatsApp'}
              </span>
            </span>
            <button className="botao-secundario" onClick={trocarPaciente}>
              Trocar paciente
            </button>
          </div>

          <div className="secao-form">
            <label htmlFor="medico">Médico</label>
            <select id="medico" value={medicoId} onChange={(e) => setMedicoId(e.target.value)}>
              <option value="">Selecione…</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} — {m.especialidade}
                </option>
              ))}
            </select>

            {medicoId && (
              <>
                <label htmlFor="tipoConsulta">Tipo de consulta</label>
                <select id="tipoConsulta" value={tipoConsultaId} onChange={(e) => setTipoConsultaId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {tiposConsulta.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.duracaoMinutos} min)
                    </option>
                  ))}
                </select>
                {tiposConsulta.length === 0 && (
                  <p className="texto-suave">Nenhum tipo de consulta cadastrado para este médico.</p>
                )}
              </>
            )}

            {tipoConsultaId && (
              <>
                <label htmlFor="data">Data</label>
                <input id="data" type="date" min={hoje()} value={data} onChange={(e) => setData(e.target.value)} />
              </>
            )}

            {tipoConsultaId && data && (
              <div className="secao-horarios">
                <label>Horário</label>
                {carregandoHorarios ? (
                  <p className="texto-suave">Carregando horários…</p>
                ) : !horarios || horarios.length === 0 ? (
                  <p className="texto-suave">Nenhum horário disponível nessa data.</p>
                ) : (
                  <div className="grade-horarios">
                    {horarios.map((h) => (
                      <button
                        key={h.inicio}
                        type="button"
                        className={
                          horarioSelecionado?.inicio === h.inicio ? 'botao-horario horario-selecionado' : 'botao-horario'
                        }
                        onClick={() => setHorarioSelecionado(h)}
                      >
                        {formatarHora(h.inicio)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {erroEnvio && <div className="mensagem-erro">{erroEnvio}</div>}

            {horarioSelecionado && (
              <>
                <label htmlFor="sala">Sala (opcional)</label>
                <select id="sala" value={salaId} onChange={(e) => setSalaId(e.target.value)}>
                  <option value="">Sem sala definida</option>
                  {salas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>

                <label htmlFor="motivo">Motivo (opcional)</label>
                <input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />

                <label htmlFor="observacoes">Observações (opcional)</label>
                <input id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />

                <button onClick={confirmarAgendamento} disabled={enviando}>
                  {enviando ? 'Agendando…' : 'Agendar consulta'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
