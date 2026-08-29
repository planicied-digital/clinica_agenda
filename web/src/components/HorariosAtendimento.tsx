import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { DiaSemana, HorarioAtendimento, Medico } from '../api/types';

const DIAS_SEMANA_ORDEM: DiaSemana[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO'];

const DIA_SEMANA_LABEL: Record<DiaSemana, string> = {
  SEGUNDA: 'Segunda-feira',
  TERCA: 'Terça-feira',
  QUARTA: 'Quarta-feira',
  QUINTA: 'Quinta-feira',
  SEXTA: 'Sexta-feira',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

function minutosParaHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function HorariosAtendimento() {
  const { sessao } = useAuth();
  const clinicaId = sessao!.usuario.clinicaId;

  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [medicoId, setMedicoId] = useState('');
  const [horarios, setHorarios] = useState<HorarioAtendimento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [diaSemana, setDiaSemana] = useState<DiaSemana>('SEGUNDA');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFim, setHoraFim] = useState('18:00');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  useEffect(() => {
    if (!sessao) return;
    api.get<Medico[]>(`/medicos?clinicaId=${clinicaId}&ativo=true`, sessao.accessToken).then(setMedicos).catch(() => {});
  }, [sessao, clinicaId]);

  useEffect(() => {
    if (!sessao || !medicoId) {
      setHorarios([]);
      return;
    }
    setCarregando(true);
    setErro(null);
    api
      .get<HorarioAtendimento[]>(`/horarios-atendimento?clinicaId=${clinicaId}&medicoId=${medicoId}`, sessao.accessToken)
      .then(setHorarios)
      .catch((e) => setErro(e instanceof ApiError ? e.message : 'Falha ao carregar horários de atendimento.'))
      .finally(() => setCarregando(false));
  }, [sessao, clinicaId, medicoId]);

  async function recarregar() {
    if (!sessao || !medicoId) return;
    const dados = await api.get<HorarioAtendimento[]>(
      `/horarios-atendimento?clinicaId=${clinicaId}&medicoId=${medicoId}`,
      sessao.accessToken,
    );
    setHorarios(dados);
  }

  async function adicionarHorario() {
    if (!sessao || !medicoId) return;
    setErroForm(null);
    if (horaParaMinutos(horaFim) <= horaParaMinutos(horaInicio)) {
      setErroForm('O horário final precisa ser depois do horário inicial.');
      return;
    }
    setSalvando(true);
    try {
      await api.post(
        '/horarios-atendimento',
        {
          clinicaId,
          medicoId,
          diaSemana,
          horaInicioMinutos: horaParaMinutos(horaInicio),
          horaFimMinutos: horaParaMinutos(horaFim),
        },
        sessao.accessToken,
      );
      await recarregar();
    } catch (e) {
      setErroForm(e instanceof ApiError ? e.message : 'Falha ao salvar horário de atendimento.');
    } finally {
      setSalvando(false);
    }
  }

  async function removerHorario(id: string) {
    if (!sessao) return;
    try {
      await api.delete(`/horarios-atendimento/${id}`, sessao.accessToken);
      await recarregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao remover horário de atendimento.');
    }
  }

  return (
    <div className="secao-form">
      <label htmlFor="horarios-medico">Médico</label>
      <select id="horarios-medico" value={medicoId} onChange={(e) => setMedicoId(e.target.value)}>
        <option value="">Selecione…</option>
        {medicos.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome} — {m.especialidade}
          </option>
        ))}
      </select>

      {medicoId && (
        <>
          {erro && <div className="mensagem-erro">{erro}</div>}

          {carregando ? (
            <p className="texto-suave">Carregando horários…</p>
          ) : horarios.length === 0 ? (
            <p className="texto-suave">Nenhum horário de atendimento cadastrado pra esse médico ainda.</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Dia da semana</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {horarios.map((h) => (
                  <tr key={h.id}>
                    <td>{DIA_SEMANA_LABEL[h.diaSemana]}</td>
                    <td>{minutosParaHora(h.horaInicioMinutos)}</td>
                    <td>{minutosParaHora(h.horaFimMinutos)}</td>
                    <td className="celula-acoes">
                      <button className="botao-secundario" onClick={() => removerHorario(h.id)}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="cartao-cadastro-rapido">
            <p className="texto-suave">Adicionar horário de atendimento:</p>

            <label htmlFor="horarios-dia">Dia da semana</label>
            <select id="horarios-dia" value={diaSemana} onChange={(e) => setDiaSemana(e.target.value as DiaSemana)}>
              {DIAS_SEMANA_ORDEM.map((d) => (
                <option key={d} value={d}>
                  {DIA_SEMANA_LABEL[d]}
                </option>
              ))}
            </select>

            <label htmlFor="horarios-inicio">Início</label>
            <input
              id="horarios-inicio"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />

            <label htmlFor="horarios-fim">Fim</label>
            <input id="horarios-fim" type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />

            {erroForm && <div className="mensagem-erro">{erroForm}</div>}

            <button onClick={adicionarHorario} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Adicionar horário'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
