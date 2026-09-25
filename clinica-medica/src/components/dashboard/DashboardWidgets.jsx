// componente visual desta parte do sistema

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// Componentes visuais reutilizáveis do Dashboard.
const statusTone = {
  Ativo: 'success', ativo: 'success', Inativo: 'muted', inativo: 'muted',
  Confirmada: 'info', confirmada: 'info', Pendente: 'warning', pendente: 'warning',
  Finalizada: 'success', finalizada: 'success', Cancelada: 'danger', cancelada: 'danger',
};

// componente metric card
export function MetricCard({ detail, icon: Icon, label, value }) {
  return (
    <article className="metric-card">
      <div>
        <span>{label}</span>
        <strong>{value ?? '--'}</strong>
        <small>{detail}</small>
      </div>
      <div className="metric-icon">
        <Icon size={20} strokeWidth={1.65} />
      </div>
    </article>
  );
}

// componente status badge
export function StatusBadge({ status }) {
  return <span className={`status-badge is-${statusTone[status] ?? 'info'}`}>{status}</span>;
}

// componente mini calendar
export function MiniCalendar({ calendario }) {
  const initialMonth = useMemo(() => {
    const firstDate = calendario[0]?.data ? new Date(`${calendario[0].data}T12:00:00`) : new Date();
    return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  }, [calendario]);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    setVisibleMonth(initialMonth);
    setSelectedDay(null);
  }, [initialMonth]);

  const scheduledDays = useMemo(() => {
  const grouped = new Map();

  calendario.forEach((consulta) => {
    if (!consulta?.data) return;

    const date = new Date(`${consulta.data}T12:00:00`);

    if (
      date.getFullYear() !== visibleMonth.getFullYear() ||
      date.getMonth() !== visibleMonth.getMonth()
    ) {
      return;
    }

    const day = Number(consulta.data.split('-')[2]);

    if (!grouped.has(day)) {
      grouped.set(day, {
        consultas: [],
        total: 0,
      });
    }

    grouped.get(day).consultas.push(consulta);
    grouped.get(day).total += 1;
  });

  return grouped;
}, [calendario, visibleMonth]);
  
  const selectedAppointments = selectedDay ? (scheduledDays.get(selectedDay)?.consultas ?? []) : [];
  const monthLabel = visibleMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const firstWeekDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const monthDays = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const emptyDays = Array.from({ length: firstWeekDay }, (_, index) => `empty-${index}`);
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// função para change month
  function changeMonth(direction) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
    setSelectedDay(null);
  }

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-title">
        <div>
          <strong>{monthLabel}</strong>
          <span>{scheduledDays.size} dias com agenda</span>
        </div>
        <div className="mini-calendar-actions">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
            <ChevronLeft size={16} strokeWidth={1.7} />
          </button>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Próximo mês">
            <ChevronRight size={16} strokeWidth={1.7} />
          </button>
        </div>
      </div>

      <div className="mini-calendar-week" aria-hidden="true">
        {weekDays.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>

      <div className="mini-calendar-grid">
        {emptyDays.map((day) => (
          <span key={day} aria-hidden="true" />
        ))}
        {monthDays.map((day) => {
          const appointments = scheduledDays.get(day)?.total;
          const hoje = new Date();
          const isToday =
            hoje.getFullYear() === visibleMonth.getFullYear() &&
            hoje.getMonth() === visibleMonth.getMonth() &&
            hoje.getDate() === day;

          return (
            <button
              className={`${appointments ? 'has-events' : ''} ${selectedDay === day ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
              key={day}
              type="button"
              onClick={() => setSelectedDay((current) => (current === day ? null : day))}
            >
              <span>{day}</span>
              {appointments ? <small>{appointments}</small> : null}
            </button>
          );
        })}
      </div>

      <div className="calendar-day-card">
        {selectedDay ? (
          <>
            <strong>Dia {String(selectedDay).padStart(2, '0')}</strong>
            {selectedAppointments.length ? (
              <div className="calendar-day-list">
                {selectedAppointments.map((consulta) => (
                  <div key={consulta.id}>
                    <span>{consulta.horario}</span>
                    <p>{consulta.paciente}</p>
                    <small>{consulta.medico}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p>Nenhuma consulta marcada para este dia.</p>
            )}
          </>
        ) : (
          <p>Selecione um dia para ver os horários.</p>
        )}
      </div>
    </div>
  );
}
