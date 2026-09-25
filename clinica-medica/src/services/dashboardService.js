// comunicação deste recurso com a API

import { apiRequest, shouldUseMocks } from './api.js';
import { ENDPOINTS } from './endpoints.js';
import { mockDashboardService } from '../mocks/mockDashboardService.js';

export const dashboardService = {
  getSummary() {
    return shouldUseMocks()
      ? mockDashboardService.getSummary()
      : apiRequest(ENDPOINTS.dashboard.summary);
  },

  getConsultasHoje() {
    return shouldUseMocks()
      ? mockDashboardService.getConsultasHoje()
      : apiRequest(ENDPOINTS.dashboard.consultasHoje);
  },

  getCalendario() {
    return shouldUseMocks()
      ? mockDashboardService.getCalendario()
      : apiRequest(ENDPOINTS.dashboard.calendario);
  },
};
