// dados e funções usados no modo de teste

import { mockDatabase } from './mockData.js';
import { clone, createId, normalizeSearch, waitMock } from './mockUtils.js';

const searchFieldsByResource = {
  consultas: ['paciente', 'medico', 'especialidade', 'status'],
  especialidades: ['nome', 'descricao', 'status'],
  medicos: ['nome', 'crm', 'especialidade', 'email', 'status'],
  pacientes: ['nome', 'cpf', 'telefone', 'email', 'cidade', 'estado'],
};

export const mockCrudService = {
  async list(resource, params = {}) {
    await waitMock();

    const search = normalizeSearch(params.search);
    const fields = searchFieldsByResource[resource] ?? ['nome'];
    const records = mockDatabase[resource] ?? [];

    if (!search) {
      return clone(records);
    }

    return clone(
      records.filter((record) =>
        fields.some((field) => normalizeSearch(record[field]).includes(search)),
      ),
    );
  },

  async getById(resource, id) {
    await waitMock();
    const record = findRecord(resource, id);
    return clone(record);
  },

  async create(resource, payload) {
    await waitMock();
    const prefix = resource.slice(0, 3);
    const record = {
      id: createId(prefix),
      ...payload,
    };

    mockDatabase[resource].unshift(record);
    return clone(record);
  },

  async restore(resource, payload) {
    await waitMock();
    const records = mockDatabase[resource];
    const record = clone(payload);
    const existingIndex = records.findIndex((item) => item.id === record.id);

    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.unshift(record);
    }

    return clone(record);
  },

  async update(resource, id, payload) {
    await waitMock();
    const index = findIndex(resource, id);
    mockDatabase[resource][index] = {
      ...mockDatabase[resource][index],
      ...payload,
    };

    return clone(mockDatabase[resource][index]);
  },

  async toggleStatus(resource, id) {
    await waitMock();
    const index = findIndex(resource, id);
    const currentStatus = mockDatabase[resource][index].status;
    mockDatabase[resource][index].status = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';

    return clone(mockDatabase[resource][index]);
  },

  async remove(resource, id) {
    await waitMock();
    const index = findIndex(resource, id);
    const [removed] = mockDatabase[resource].splice(index, 1);

    return clone({
      mensagem: 'Registro removido com sucesso',
      record: removed,
    });
  },
};

// função para find record
function findRecord(resource, id) {
  const record = mockDatabase[resource]?.find((item) => item.id === id);

  if (!record) {
    throw new Error('Registro não encontrado.');
  }

  return record;
}

// função para find index
function findIndex(resource, id) {
  const index = mockDatabase[resource]?.findIndex((item) => item.id === id) ?? -1;

  if (index < 0) {
    throw new Error('Registro não encontrado.');
  }

  return index;
}
