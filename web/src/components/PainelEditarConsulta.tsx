import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../api/client';
import type { Consulta, Sala, TipoConsulta } from '../api/types';

export function PainelEditarConsulta({
  consulta,
  onSalva,
  onFechar,
}: {
  consulta: Consulta;
  onSalva: () => void;
  onFechar: () => void;
}) {
  const { sessao } = useAuth();
  const clinicaId = sessao!.usuario.clinicaId;

  const [salas, setSalas] = useState<Sala[]>([]);
  const [tiposConsulta, setTiposConsulta] = useState<TipoConsulta[]>([]);
  const [salaId, setSalaId] = useState(consulta.sala?.id ?? '');
  const [tipoConsultaId, setTipoConsultaId] = useState(consulta.tipoConsulta?.id ?? '');
  const [motivo, setMotivo] = useState(consulta.motivo ?? '');
  const [observacoes, setObservacoes] = useState(consulta.observacoes ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!sessao) return;
    api.get<Sala[]>(`/salas?clinicaId=${clinicaId}`, sessao.accessToken).then(setSalas).catch(() => {});
    api
      .get<TipoConsulta[]>(`/tipos-consulta?clinicaId=${clinicaId}&medicoId=${consulta.medico.id}`, sessao.accessToken)
      .then(setTiposConsulta)
      .catch(() => {});
  }, [sessao, clinicaId, consulta.medico.id]);

  async function salvar() {
    if (!sessao) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.patch(
        `/consultas/${consulta.id}`,
        {
          salaId: salaId || undefined,
          tipoConsultaId: tipoConsultaId || undefined,
          motivo: motivo || undefined,
          observacoes: observacoes || undefined,
        },
        sessao.accessToken,
      );
      onSalva();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="painel-inline">
      <label htmlFor={`editar-tipo-${consulta.id}`}>Tipo de consulta</label>
      <select id={`editar-tipo-${consulta.id}`} value={tipoConsultaId} onChange={(e) => setTipoConsultaId(e.target.value)}>
        <option value="">Sem tipo definido</option>
        {tiposConsulta.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome} ({t.duracaoMinutos} min)
          </option>
        ))}
      </select>

      <label htmlFor={`editar-sala-${consulta.id}`}>Sala</label>
      <select id={`editar-sala-${consulta.id}`} value={salaId} onChange={(e) => setSalaId(e.target.value)}>
        <option value="">Sem sala definida</option>
        {salas.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nome}
          </option>
        ))}
      </select>

      <label htmlFor={`editar-motivo-${consulta.id}`}>Motivo</label>
      <input id={`editar-motivo-${consulta.id}`} value={motivo} onChange={(e) => setMotivo(e.target.value)} />

      <label htmlFor={`editar-observacoes-${consulta.id}`}>Observações</label>
      <input
        id={`editar-observacoes-${consulta.id}`}
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
      />

      {erro && <div className="mensagem-erro">{erro}</div>}

      <div className="celula-acoes">
        <button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
        <button className="botao-secundario" onClick={onFechar} disabled={salvando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
