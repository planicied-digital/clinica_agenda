import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import type { SlotDisponivel } from '../api/types';

interface UseDisponibilidadeParams {
  medicoId: string;
  data: string;
  // Um dos dois — tipoConsultaId tem prioridade se ambos vierem (ver
  // DisponibilidadeQueryDto no back-end). duracaoMinutos existe pra remarcar
  // consultas antigas sem tipoConsultaId cadastrado.
  tipoConsultaId?: string;
  duracaoMinutos?: number;
}

// Busca os horários livres pra médico+duração+data, recarregando sempre que
// algum desses muda. Usado por NovaConsulta e pelo painel de remarcar em
// AgendaHoje — o back-end já faz toda a lógica de cruzar agenda semanal,
// bloqueios e consultas existentes, o front só lista o resultado.
export function useDisponibilidade({ medicoId, data, tipoConsultaId, duracaoMinutos }: UseDisponibilidadeParams) {
  const { sessao } = useAuth();
  const [horarios, setHorarios] = useState<SlotDisponivel[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  const recarregar = useCallback(() => {
    if (!sessao || !medicoId || !data || (!tipoConsultaId && !duracaoMinutos)) {
      setHorarios(null);
      return;
    }
    const params = new URLSearchParams({ medicoId, data });
    if (tipoConsultaId) {
      params.set('tipoConsultaId', tipoConsultaId);
    } else if (duracaoMinutos) {
      params.set('duracaoMinutos', String(duracaoMinutos));
    }

    setCarregando(true);
    return api
      .get<SlotDisponivel[]>(`/consultas/disponibilidade?${params.toString()}`, sessao.accessToken)
      .then(setHorarios)
      .catch(() => setHorarios([]))
      .finally(() => setCarregando(false));
  }, [sessao, medicoId, data, tipoConsultaId, duracaoMinutos]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { horarios, carregando, recarregar };
}
