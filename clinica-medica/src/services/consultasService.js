// comunicação deste recurso com a API

import { apiRequest, shouldUseMocks } from './api.js';
import { ENDPOINTS } from './endpoints.js';
import { mockConsultasService } from '../mocks/mockConsultasService.js';
import { mockCrudService } from '../mocks/mockCrudService.js';

const resource = 'consultas';

export const consultasService = {
  list(params = {}) {
    return shouldUseMocks()
      ? mockCrudService.list(resource, params)
      : apiRequest(ENDPOINTS.consultas.base);
  },

  getById(id) {
    return shouldUseMocks()
      ? mockCrudService.getById(resource, id)
      : apiRequest(ENDPOINTS.consultas.byId(id));
  },

  create(payload) {
    return shouldUseMocks()
      ? mockCrudService.create(resource, payload)
      : apiRequest(ENDPOINTS.consultas.base, { method: 'POST', body: payload });
  },

  restore(payload) {
    return shouldUseMocks()
      ? mockCrudService.restore(resource, payload)
      : apiRequest(ENDPOINTS.consultas.base, { method: 'POST', body: payload });
  },

  update(id, payload) {
    return shouldUseMocks()
      ? mockCrudService.update(resource, id, payload)
      : apiRequest(ENDPOINTS.consultas.byId(id), { method: 'PUT', body: payload });
  },

  confirmar(id) {
    return shouldUseMocks()
      ? mockConsultasService.setStatus(id, 'Confirmada')
      : apiRequest(ENDPOINTS.consultas.confirmar(id), { method: 'PATCH' });
  },

  finalizar(id) {
    return shouldUseMocks()
      ? mockConsultasService.setStatus(id, 'Finalizada')
      : apiRequest(ENDPOINTS.consultas.finalizar(id), { method: 'PATCH' });
  },

  cancelar(id, motivoCancelamento) {
    return shouldUseMocks()
      ? mockConsultasService.cancelar(id, motivoCancelamento)
      : apiRequest(ENDPOINTS.consultas.cancelar(id), {
          method: 'PATCH',
          body: { motivoCancelamento },
        });
  },

  remove(id) {
    return shouldUseMocks()
      ? mockCrudService.remove(resource, id)
      : apiRequest(ENDPOINTS.consultas.byId(id), { method: 'DELETE' });
  },
};
