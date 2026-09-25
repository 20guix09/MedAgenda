// comunicação deste recurso com a API

import { apiRequest, shouldUseMocks } from './api.js';
import { ENDPOINTS } from './endpoints.js';
import { mockCrudService } from '../mocks/mockCrudService.js';

const resource = 'pacientes';

// função para to backend payload
function toBackendPayload(payload = {}) {
  return {
    nome: payload.nome,
    cpf: payload.cpf,
    nasc: payload.data_nascimento ?? payload.nasc ?? payload.dataNascimento,
    sexo: payload.sexo ?? null,
    tel: payload.telefone ?? payload.tel,
    email: payload.email,
    cep: payload.cep ?? null,
    rua: payload.rua ?? null,
    num: payload.numero ?? payload.num ?? null,
    comp: payload.complemento ?? payload.comp ?? null,
    bairro: payload.bairro ?? null,
    cid: payload.cidade ?? payload.cid ?? null,
    est: payload.estado ?? payload.est ?? null,
  };
}

export const pacientesService = {
  list(params = {}) {
    return shouldUseMocks()
      ? mockCrudService.list(resource, params)
      : apiRequest(ENDPOINTS.pacientes.base);
  },

  getById(id) {
    return shouldUseMocks()
      ? mockCrudService.getById(resource, id)
      : apiRequest(ENDPOINTS.pacientes.byId(id));
  },

  create(payload) {
    return shouldUseMocks()
      ? mockCrudService.create(resource, payload)
      : apiRequest(ENDPOINTS.pacientes.base, {
          method: 'POST',
          body: toBackendPayload(payload),
        });
  },

  restore(payload) {
    return shouldUseMocks()
      ? mockCrudService.restore(resource, payload)
      : apiRequest(ENDPOINTS.pacientes.base, {
          method: 'POST',
          body: toBackendPayload(payload),
        });
  },

  update(id, payload) {
    return shouldUseMocks()
      ? mockCrudService.update(resource, id, payload)
      : apiRequest(ENDPOINTS.pacientes.byId(id), {
          method: 'PUT',
          body: toBackendPayload(payload),
        });
  },

  remove(id) {
    return shouldUseMocks()
      ? mockCrudService.remove(resource, id)
      : apiRequest(ENDPOINTS.pacientes.byId(id), { method: 'DELETE' });
  },
};
