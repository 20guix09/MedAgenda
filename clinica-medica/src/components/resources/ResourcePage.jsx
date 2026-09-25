// componente visual desta parte do sistema

import { ChevronDown, ChevronUp, Edit3, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBadge } from '../dashboard/DashboardWidgets.jsx';
import { pacientesService } from '../../services/pacientesService.js';
import { medicosService } from '../../services/medicosService.js';
import { especialidadesService } from '../../services/especialidadesService.js';

// CRUD genérico usado pelas telas de pacientes, médicos, consultas e especialidades.
const resourceNames = { consultas: 'Consulta', especialidades: 'Especialidade', medicos: 'Médico', pacientes: 'Paciente' };
const pacienteAliases = {
  telefone: ['telefone', 'tel'], data_nascimento: ['data_nascimento', 'nasc', 'dataNascimento'],
  numero: ['numero', 'num'], complemento: ['complemento', 'comp'], cidade: ['cidade', 'cid'], estado: ['estado', 'est'],
};

// obtém data e horário locais para impedir agendamentos no passado
function getLocalNow() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

const fieldPlaceholders = {
  nome:'Ex.: Mariana Oliveira', cpf:'Ex.: 123.456.789-01', telefone:'Ex.: (11) 99999-1234', email:'Ex.: exemplo@e-mail.com',
  data_nascimento:'Ex.: 29/08/1990', sexo:'Ex.: Masculino', cep:'Ex.: 86000-000', rua:'Ex.: Rua das Flores', numero:'Ex.: 120',
  complemento:'Ex.: Apto. 12', bairro:'Ex.: Centro', cidade:'Ex.: Londrina', estado:'Ex.: PR', crm:'Ex.: CRM-PR 123456',
  estado_crm:'Ex.: PR', tipo:'Ex.: Consulta de retorno', observacao:'Ex.: Retorno com exames em mãos.', descricao:'Ex.: Atendimento especializado.',
};
// obtém resource field value
function getResourceFieldValue(resource, key, item = {}) {
  if (resource === 'pacientes' && pacienteAliases[key]) {
    for (const alias of pacienteAliases[key]) {
      const value = item?.[alias];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return '';
  }
  return item?.[key] ?? '';
}

// componente resource page
export default function ResourcePage({ config, onDataChange, onRecordDeleted, refreshKey }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    let isMounted = true;

// função para load items
    async function loadItems() {
      setIsLoading(true);
      const data = await config.service.list();

      if (!isMounted) return;
      setItems(data);
      setIsLoading(false);
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [config, refreshKey]);

  const filteredItems = useMemo(() => {
    const search = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    if (!search) return items;

    return items.filter((item) => {
      const searchableKeys = config.searchKeys ?? Object.keys(item ?? {});

      return searchableKeys.some((key) =>
        String(item?.[key] ?? '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(search),
      );
    });
  }, [items, query, config.searchKeys]);

// função para reload items
  async function reloadItems() {
    setIsLoading(true);
    const data = await config.service.list();
    setItems(data);
    setIsLoading(false);
  }

// função para open modal
  async function openModal(mode, item = null) {
    if (mode === 'create' || !item?.id) {
      setModal({ mode, item: item ?? {} });
      return;
    }

    try {
      // Busca o registro completo antes de visualizar/editar.
      // Assim campos que não aparecem na tabela continuam disponíveis no modal.
      const completo = await config.service.getById(item.id);
      setModal({ mode, item: completo ?? item });
    } catch (error) {
      console.error(`Erro ao carregar ${config.resource}:`, error);
      setModal({ mode, item });
    }
  }

// função para handle save
  async function handleSave(values) {
    try {
      if (modal?.mode === 'edit') {
        await config.service.update(modal.item.id, values);
      } else {
        const payload = { ...values };

        if (config.resource === 'consultas') {
          payload.status = payload.status || 'pendente';
        }

        await config.service.create(payload);
      }

      setModal(null);
      await reloadItems();
      await onDataChange();
    } catch (error) {
      console.error(`Erro ao salvar ${config.resource}:`, error);
      window.alert(error?.message || 'Não foi possível salvar o registro.');
    }
  }

// função para handle delete
  async function handleDelete(item) {
    const result = await config.service.remove(item.id);
    onRecordDeleted({
      resource: config.resource,
      resourceLabel: resourceNames[config.resource] ?? config.title,
      record: result?.record ?? item,
    });
    await reloadItems();
    await onDataChange();
  }

  return (
    <>
      <section className="dashboard-hero resource-hero">
        <div>
          <p>MedAgenda</p>
          <h1>{config.title}</h1>
          <span>{config.subtitle}</span>
        </div>
        <button className="dashboard-primary-action interactive-press" type="button" onClick={() => openModal('create')}>
          <Plus size={18} strokeWidth={1.7} />
          <span>{config.action}</span>
        </button>
      </section>

      <article className="dashboard-panel resource-panel">
        <div className="resource-toolbar">
          <label className="app-search resource-search">
            <Search size={18} strokeWidth={1.6} />
            <input type="search" placeholder={config.search} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <span>{isLoading ? 'Carregando' : `${filteredItems.length} registros`}</span>
        </div>

        <div className="resource-table-wrap">
          <table className="resource-table">
            <thead>
              <tr>
                {config.columns.map(([, label]) => (
                  <th key={label}>{label}</th>
                ))}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  {config.columns.map(([key, label]) => (
                    <td key={key} data-label={label}>{key === 'status' ? <StatusBadge status={item[key]} /> : item[key] || '-'}</td>
                  ))}
                  <td data-label="Ações">
                    <div className="resource-actions">
                      <button type="button" aria-label="Visualizar" onClick={() => openModal('view', item)}>
                        <Eye size={16} strokeWidth={1.65} />
                      </button>
                      <button type="button" aria-label="Editar" onClick={() => openModal('edit', item)}>
                        <Edit3 size={16} strokeWidth={1.65} />
                      </button>
                      <button type="button" aria-label="Excluir" onClick={() => handleDelete(item)}>
                        <Trash2 size={16} strokeWidth={1.65} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {modal ? (
        <ResourceModal
          config={config}
          item={modal.item}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      ) : null}
    </>
  );
}

// componente resource modal
export function ResourceModal({ config, item = {}, mode, onClose, onSave }) {
  const isView = mode === 'view';
  const title =
    mode === 'create'
      ? config.action
      : mode === 'edit'
        ? `Editar ${resourceNames[config.resource] ?? config.title}`
        : `Detalhes de ${resourceNames[config.resource] ?? config.title}`;

  const [formValues, setFormValues] = useState(() =>
    Object.fromEntries(
      config.fields
        .filter(([, , type]) => !['select', 'patient', 'doctor', 'specialty', 'specialties'].includes(type))
        .map(([key]) => [key, getResourceFieldValue(config.resource, key, item)]),
    ),
  );

  const [selectValues, setSelectValues] = useState(() =>
    Object.fromEntries(
      config.fields
        .filter(([, , type]) => type === 'select')
        .map(([key, , , options]) => [key, item[key] ?? options?.[0] ?? '']),
    ),
  );

  const [relationOptions, setRelationOptions] = useState({
    patient: [],
    doctor: [],
    specialty: [],
    specialties: [],
  });
  const [relationValues, setRelationValues] = useState(() => ({
    patient: item.paciente_id ?? '',
    doctor: item.medico_id ?? '',
    specialty: item.especialidade_id ?? '',
    specialties: item.especialidade_ids ?? (item.especialidade_id ? [item.especialidade_id] : []),
  }));
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [specialtiesOpen, setSpecialtiesOpen] = useState(false);
  const specialtiesPickerRef = useRef(null);

  useEffect(() => {
// função para handle outside click
    function handleOutsideClick(event) {
      if (specialtiesPickerRef.current && !specialtiesPickerRef.current.contains(event.target)) {
        setSpecialtiesOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    let isMounted = true;

// função para load relations
    async function loadRelations() {
      const relationTypes = config.fields
        .map(([, , type]) => type)
        .filter((type) => ['patient', 'doctor', 'specialty', 'specialties'].includes(type));

      if (!relationTypes.length) return;

      setIsLoadingRelations(true);

      try {
        const requests = relationTypes.map((type) => {
          if (type === 'patient') return pacientesService.list();
          if (type === 'doctor') return medicosService.list();
          return especialidadesService.list();
        });

        const results = await Promise.all(requests);

        if (!isMounted) return;

        const next = { patient: [], doctor: [], specialty: [], specialties: [] };

        relationTypes.forEach((type, index) => {
          const options = Array.isArray(results[index]) ? results[index] : [];

          next[type] = options.filter((option) => {
            const ativo = !option?.status || String(option.status).toLowerCase() === 'ativo';
            if (ativo) return true;
            if (mode !== 'edit') return false;

            if (type === 'doctor') return Number(option.id) === Number(item.medico_id);
            if (type === 'specialty') return Number(option.id) === Number(item.especialidade_id);
            if (type === 'specialties') {
              return (item.especialidade_ids ?? []).map(Number).includes(Number(option.id));
            }
            return false;
          });
        });

        setRelationOptions(next);
      } catch (error) {
        console.error('Erro ao carregar opções do formulário:', error);
      } finally {
        if (isMounted) setIsLoadingRelations(false);
      }
    }

    loadRelations();

    return () => {
      isMounted = false;
    };
  }, [config]);

// função para handle submit
  function handleSubmit(event) {
    event.preventDefault();

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    if (config.resource === 'medicos') {
      values.especialidade_ids = relationValues.specialties;
      values.especialidade_id = relationValues.specialties?.[0] ?? '';
    }
    if (config.resource === 'medicos' && !relationValues.specialties?.length) {
      window.alert('Selecione pelo menos uma especialidade para o médico.');
      return;
    }

    if (config.resource === 'consultas') {
      values.paciente_id = relationValues.patient;
      values.medico_id = relationValues.doctor;
      values.especialidade_id = relationValues.specialty;

      if (mode === 'create') {
        const agora = getLocalNow();
        const dataSelecionada = String(values.data ?? '');
        const horarioSelecionado = String(values.horario ?? '').slice(0, 5);

        if (dataSelecionada < agora.date || (dataSelecionada === agora.date && horarioSelecionado < agora.time)) {
          window.alert('Não é possível cadastrar uma consulta em uma data ou horário que já passou.');
          return;
        }

        values.status = 'pendente';
      }
    }

    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === 'string') {
        values[key] = value.trim();
      }
    });

    onSave(values);
  }

// obtém relation label
  function getRelationLabel(type, option) {
    if (type === 'patient') return option.nome;
    if (type === 'doctor') {
      return option.nome
        ? `${option.nome}${option.crm ? ` — ${option.crm}` : ''}`
        : '';
    }
    return option.nome;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="resource-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading">
          <div>
            <p>MedAgenda</p>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </div>

        {isView ? (
          <div className="detail-summary">
            {config.fields.map(([key, label, type]) => {
              let value = getResourceFieldValue(config.resource, key, item);

              if (type === 'patient') value = item.paciente ?? item.paciente_id;
              if (type === 'doctor') value = item.medico ?? item.medico_id;
              if (type === 'specialty') value = item.especialidade ?? item.especialidade_id;
              if (type === 'specialties') value = item.especialidades_nomes ?? item.especialidade ?? '-';

              return (
                <div
                  className={key === 'observacao' || key === 'descricao' ? 'is-wide' : ''}
                  key={key}
                >
                  <span>{label}</span>
                  {key === 'status' ? (
                    <StatusBadge status={item[key]} />
                  ) : (
                    <strong>{value || '-'}</strong>
                  )}
                </div>
              );
            })}

            <div className="modal-actions">
              <button type="button" onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            {config.fields.map(([key, label, type = 'text', options]) => {
              if (config.resource === 'consultas' && mode === 'create' && key === 'status') return null;

              return (
              <label key={key}>
                <span>{label}</span>

                {type === 'select' ? (
                  <FieldSelect
                    name={key}
                    options={options}
                    value={selectValues[key]}
                    onChange={(value) =>
                      setSelectValues((current) => ({
                        ...current,
                        [key]: value,
                      }))
                    }
                  />
                ) : type === 'specialties' ? (
                  <div className={`specialties-dropdown ${specialtiesOpen ? 'is-open' : ''}`} ref={specialtiesPickerRef}>
                    <button
                      type="button"
                      className="specialties-trigger"
                      disabled={isLoadingRelations}
                      onClick={() => setSpecialtiesOpen((open) => !open)}
                      aria-expanded={specialtiesOpen}
                    >
                      <span>
                        {(relationValues.specialties ?? []).length
                          ? `${(relationValues.specialties ?? []).length} especialidade${(relationValues.specialties ?? []).length > 1 ? 's' : ''} selecionada${(relationValues.specialties ?? []).length > 1 ? 's' : ''}`
                          : 'Selecionar especialidade'}
                      </span>
                      {specialtiesOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {specialtiesOpen && (
                      <div className="specialties-menu">
                        {(relationOptions.specialties ?? []).map((option) => {
                          const checked = (relationValues.specialties ?? []).map(Number).includes(Number(option.id));
                          return (
                            <button
                              type="button"
                              className={`specialty-option ${checked ? 'is-selected' : ''}`}
                              key={option.id}
                              onClick={() => setRelationValues((current) => ({
                                ...current,
                                specialties: checked
                                  ? (current.specialties ?? []).filter((id) => Number(id) !== Number(option.id))
                                  : [...(current.specialties ?? []), option.id],
                              }))}
                            >
                              <span>{option.nome}</span>
                              <span className="specialty-radio" aria-hidden="true">
                                {checked && <span />}
                              </span>
                            </button>
                          );
                        })}
                        {!(relationOptions.specialties ?? []).length && (
                          <div className="specialties-empty">Cadastre uma especialidade primeiro.</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : ['patient', 'doctor', 'specialty'].includes(type) ? (
                  <RelationSelect
                    name={key}
                    relationType={type}
                    options={relationOptions[type]}
                    value={relationValues[type]}
                    disabled={isLoadingRelations}
                    onChange={(value) =>
                      setRelationValues((current) => ({
                        ...current,
                        [type]: value,
                      }))
                    }
                    getLabel={getRelationLabel}
                  />
                ) : (
                  <div className="modal-input-wrap">
                    {key === 'observacao' || key === 'descricao' ? (
                      <textarea
                        name={key}
                        value={formValues[key] ?? ''}
                        placeholder={config.placeholders?.[key] ?? fieldPlaceholders[key]}
                        onChange={(event) =>
                          setFormValues((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                      />
                    ) : (
                      <input
                        name={key}
                        type={type}
                        value={formValues[key] ?? ''}
                        min={
                          config.resource === 'consultas' && mode === 'create' && key === 'data'
                            ? getLocalNow().date
                            : config.resource === 'consultas' && mode === 'create' && key === 'horario' && formValues.data === getLocalNow().date
                              ? getLocalNow().time
                              : undefined
                        }
                        max={config.resource === 'pacientes' && key === 'data_nascimento' ? getLocalNow().date : undefined}
                        required={config.resource === 'pacientes' && ['numero', 'complemento'].includes(key)}
                        placeholder={config.placeholders?.[key] ?? fieldPlaceholders[key]}
                        onChange={async (event) => {
                          const value = event.target.value;
                          setFormValues((current) => ({ ...current, [key]: value }));

                          if (config.resource === 'pacientes' && key === 'cep') {
                            const cepLimpo = value.replace(/\D/g, '');
                            if (cepLimpo.length === 8) {
                              try {
                                const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
                                const endereco = await response.json();
                                if (!endereco.erro) {
                                  setFormValues((current) => ({
                                    ...current,
                                    cep: value,
                                    rua: endereco.logradouro ?? '',
                                    bairro: endereco.bairro ?? '',
                                    cidade: endereco.localidade ?? '',
                                    estado: endereco.uf ?? '',
                                  }));
                                }
                              } catch (error) {
                                console.error('Erro ao consultar CEP:', error);
                              }
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                )}
              </label>
              );
            })}

            <div className="modal-actions">
              <button className="modal-cancel-action" type="button" onClick={onClose}>
                Cancelar
              </button>
              <button className="modal-save-action" type="submit">
                <span>Salvar</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

// componente relation select
function RelationSelect({
  name,
  relationType,
  options,
  value,
  disabled,
  onChange,
  getLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

// função para handle outside click
    function handleOutsideClick(event) {
      if (!selectRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const selected = options.find((option) => String(option.id) === String(value));
  const selectedLabel = selected ? getLabel(relationType, selected) : 'Selecione uma opção';

  return (
    <div className={`modal-select ${isOpen ? 'is-open' : ''}`} ref={selectRef}>
      <input type="hidden" name={name} value={value ?? ''} />

      <button
        className="modal-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{disabled ? 'Carregando...' : selectedLabel}</span>
        {isOpen ? (
          <ChevronUp size={17} strokeWidth={1.7} />
        ) : (
          <ChevronDown size={17} strokeWidth={1.7} />
        )}
      </button>

      {isOpen ? (
        <div className="modal-select-menu" role="listbox" aria-label={name}>
          {options.length ? (
            options.map((option) => (
              <button
                className={String(option.id) === String(value) ? 'is-selected' : ''}
                key={option.id}
                type="button"
                role="option"
                aria-selected={String(option.id) === String(value)}
                onClick={() => {
                  onChange(String(option.id));
                  setIsOpen(false);
                }}
              >
                {getLabel(relationType, option)}
              </button>
            ))
          ) : (
            <span className="modal-select-empty">Nenhuma opção cadastrada.</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

// componente field select
function FieldSelect({ name, options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

// função para handle outside click
    function handleOutsideClick(event) {
      if (!selectRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div className={`modal-select ${isOpen ? 'is-open' : ''}`} ref={selectRef}>
      <input type="hidden" name={name} value={value} />
      <button
        className="modal-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{value}</span>
        {isOpen ? <ChevronUp size={17} strokeWidth={1.7} /> : <ChevronDown size={17} strokeWidth={1.7} />}
      </button>
      {isOpen ? (
        <div className="modal-select-menu" role="listbox" aria-label={name}>
          {options.map((option) => (
            <button
              className={option === value ? 'is-selected' : ''}
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
