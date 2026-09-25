// componente visual desta parte do sistema

import { RotateCcw } from 'lucide-react';
import { systemGuide } from '../../config/systemGuide.js';

// Modal central para informações do sistema e histórico da conta.
export default function SystemModal({ deletedHistory, mode, onClose, onRestore, onOpenTutorial }) {
  const isHistory = mode === 'history';

  return (
    <div className="modal-backdrop" role="presentation">
      <section className={`resource-modal system-modal ${isHistory ? 'is-history' : ''}`} role="dialog" aria-modal="true" aria-label={isHistory ? 'Histórico' : 'Informações'}>
        <div className="modal-heading">
          <div>
            <p>MedAgenda</p>
            <h2>{isHistory ? 'Histórico' : 'Informações do sistema'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </div>

        {isHistory ? (
          <div className="history-list">
            {deletedHistory.length ? (
              deletedHistory.map((entry) => (
                <article key={entry.id}>
                  <div>
                    <span>{entry.restored ? `${entry.resourceLabel} restaurado` : `${entry.resourceLabel} excluído`}</span>
                    <strong>{getRecordTitle(entry.record)}</strong>
                  </div>
                  <small>{entry.restored ? `Restaurado em ${entry.restoredAt}` : `Excluído em ${entry.date}`}</small>
                  <p>{getRecordSummary(entry.record)}</p>
                  <button className="history-restore-action" type="button" onClick={() => onRestore(entry)} disabled={entry.restored}>
                    <RotateCcw size={15} strokeWidth={1.8} />
                    <span>{entry.restored ? 'Restaurado' : 'Restaurar'}</span>
                  </button>
                </article>
              ))
            ) : (
              <p>Nenhum registro excluído por enquanto.</p>
            )}
            <div className="modal-actions">
              <button type="button" onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <div className="system-info-grid">
            {systemGuide.map((section) => (
              <article key={section.title}>
                <strong>{section.title}</strong>
                <p>{section.text}</p>
              </article>
            ))}
            <div className="modal-actions system-info-actions">
              <button type="button" className="secondary-action" onClick={onOpenTutorial}>
                Ver tutorial novamente
              </button>
              <button type="button" onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// obtém record title
function getRecordTitle(record) {
  return record?.nome ?? record?.paciente ?? record?.especialidade ?? record?.email ?? 'Registro sem nome';
}

// obtém record summary
function getRecordSummary(record) {
  const details = [
    record?.cpf,
    record?.crm,
    record?.telefone,
    record?.email,
    record?.medico,
    record?.data && record?.horario ? `${record.data} às ${record.horario}` : record?.data,
    record?.status,
  ].filter(Boolean);

  return details.length ? details.join(' - ') : 'Sem detalhes adicionais.';
}
