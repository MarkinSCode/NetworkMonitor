import api from './api';
import { Client, ClientDetail, MetricsHistory, MonitorSummary } from '../types';

class MonitoringService {
  async getSummary(): Promise<MonitorSummary> {
    const response = await api.get<MonitorSummary>('/monitoring/summary');
    return response.data;
  }
  
  async getClients(department?: string): Promise<Client[]> {
    const params = department ? { department } : {};
    const response = await api.get<Client[]>('/monitoring/clients', { params });
    return response.data;
  }
  
  async getClientDetail(clientId: number): Promise<ClientDetail> {
    const response = await api.get<ClientDetail>(`/monitoring/clients/${clientId}`);
    return response.data;
  }
  async getMonitorSettings(): Promise<{ collect_interval: number }> {
    const response = await api.get('/monitoring/settings');
    return response.data;
  }

  async updateMonitorInterval(interval: number): Promise<void> {
    await api.put('/monitoring/settings/interval', { interval });
  }

  async getClientHistory(
    clientId: number,
    fromTime?: string,
    toTime?: string
  ): Promise<MetricsHistory[]> {
    const params = { from_time: fromTime, to_time: toTime };
    const response = await api.get<MetricsHistory[]>(
      `/monitoring/clients/${clientId}/history`,
      { params }
    );
    return response.data;
  }
  async updateClientName(clientId: number, displayName: string): Promise<void> {
    await api.put(`/monitoring/clients/${clientId}/name`, {
      display_name: displayName
    });
  }
}

export const monitoringService = new MonitoringService();