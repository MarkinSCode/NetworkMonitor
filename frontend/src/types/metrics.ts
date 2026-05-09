export interface Process {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
}

export interface LatestMetrics {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  timestamp: string;
  cpu_cores?: number[];
  cpu_model?: string;
  cpu_frequency?: number;
  processes?: Process[];
  total_processes?: number;
  collect_interval?: number;
}

export interface Client {
  id: number;
  mac_address: string | null;
  display_name: string | null;
  hostname: string | null;
  last_seen: string | null;
  is_active: boolean;
  os_info: string | null;
  latest_metrics?: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
    timestamp: string;
  } | null;
}
export interface ClientDetail extends Client {
  latest_metrics: LatestMetrics | null;
}

export interface MetricsHistory {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
}

export interface MonitorSummary {
  total_clients: number;
  active_clients: number;
  alerts: number;
  average_cpu: number;
  average_memory: number;
}
