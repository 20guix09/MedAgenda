// comunicação deste recurso com a API

import { apiRequest, shouldUseMocks } from './api.js';
import { ENDPOINTS } from './endpoints.js';
import { mockCrudService } from '../mocks/mockCrudService.js';

const resource = 'medicos';

export const medicosService = {
  list(params = {}) {
    return shouldUseMocks()
      ? mockCrudService.list(resource, params)
      : apiRequest(ENDPOINTS.medicos.base);
  },

  getById(id) {
    return shouldUseMocks()
      ? mockCrudService.getById(resource, id)
      : apiRequest(ENDPOINTS.medicos.byId(id));
  },

  create(payload) {
    return shouldUseMocks()
      ? mockCrudService.create(resource, payload)
      : apiRequest(ENDPOINTS.medicos.base, { method: 'POST', body: payload });
  },

  restore(payload) {
    return shouldUseMocks()
      ? mockCrudService.restore(resource, payload)
      : apiRequest(ENDPOINTS.medicos.base, { method: 'POST', body: payload });
  },

  update(id, payload) {
    return shouldUseMocks()
      ? mockCrudService.update(resource, id, payload)
      : apiRequest(ENDPOINTS.medicos.byId(id), { method: 'PUT', body: payload });
  },

  toggleStatus(id, status) {
    return shouldUseMocks()
      ? mockCrudService.toggleStatus(resource, id)
      : apiRequest(ENDPOINTS.medicos.status(id), {
          method: 'PATCH',
          body: { status },
        });
  },

  remove(id) {
    return shouldUseMocks()
      ? mockCrudService.remove(resource, id)
      : apiRequest(ENDPOINTS.medicos.byId(id), { method: 'DELETE' });
  },
};
