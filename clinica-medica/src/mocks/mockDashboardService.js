// dados e funções usados no modo de teste

import { mockDatabase } from './mockData.js';
import { clone, waitMock } from './mockUtils.js';

export const mockDashboardService = {
  async getSummary() {
    await waitMock();
    const today = getLocalDateKey();

    const consultasHoje = mockDatabase.consultas.filter((consulta) => consulta.data === today);
    const consultasPendentes = mockDatabase.consultas.filter(
      (consulta) => consulta.status === 'Pendente',
    );

    return {
      consultasHoje: consultasHoje.length,
      pacientesCadastrados: mockDatabase.pacientes.length,
      medicosAtivos: mockDatabase.medicos.filter((medico) => medico.status === 'Ativo').length,
      consultasPendentes: consultasPendentes.length,
    };
  },

  async getConsultasHoje() {
    await waitMock();
    const today = getLocalDateKey();

    return clone(mockDatabase.consultas.filter((consulta) => consulta.data === today));
  },

  async getCalendario() {
    await waitMock();

    return clone(
      mockDatabase.consultas.reduce((calendar, consulta) => {
        const day = calendar.find((item) => item.data === consulta.data);

        if (day) {
          day.consultas.push(consulta);
          return calendar;
        }

        calendar.push({
          data: consulta.data,
          consultas: [consulta],
        });

        return calendar;
      }, []),
    );
  },
};

// obtém local date key
function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
