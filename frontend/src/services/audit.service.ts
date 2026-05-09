import api from './api';

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  description: string | null;
  ip_address: string | null;
  timestamp: string;
}

export interface AuditResponse {
  total: number;
  logs: AuditLog[];
}

export interface AuditFilters {
  user_id?: string;
  user_name?: string;
  action?: string;
  description?: string;
  from_time?: string;
  to_time?: string;
  limit?: number;
  offset?: number;
}

class AuditService {
  async getLogs(filters: AuditFilters = {}): Promise<AuditResponse> {
    const params: any = { limit: filters.limit || 50, offset: filters.offset || 0 };
    
    if (filters.user_id) params.user_id = parseInt(filters.user_id);
    if (filters.user_name) params.user_name = filters.user_name;
    if (filters.action) params.action = filters.action;
    if (filters.description) params.description = filters.description;
    if (filters.from_time) params.from_time = filters.from_time;
    if (filters.to_time) params.to_time = filters.to_time;
    
    const response = await api.get('/audit/', { params });
    return response.data;
  }
}

export const auditService = new AuditService();