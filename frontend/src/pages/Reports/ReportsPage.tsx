import React, { useState, useEffect } from 'react';
import styles from './Reports.module.css';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { config } from '../../config';
interface Report {
  id: number;
  client_id: number | null;
  client_name: string;
  client_mac: string;
  node_id: string | null;
  node_label: string | null;
  user_id: number;
  user_name: string;
  description: string;
  created_at: string;
}

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    user_name: '', node_label: '', client_id: '', client_name: '',
    from_time: '', to_time: ''
  });
  const limit = 20;

  useEffect(() => { fetchReports(); }, [page, filters]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (filters.user_name) params.set('user_id', filters.user_name);
      if (filters.node_label) params.set('node_label', filters.node_label);
      if (filters.client_id) params.set('client_id', filters.client_id);
      if (filters.client_name) params.set('client_name', filters.client_name);
      if (filters.from_time) params.set('from_time', filters.from_time);
      if (filters.to_time) params.set('to_time', filters.to_time);

      const res = await fetch(`${config.apiUrl}/reports/?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
        setTotal(data.total);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const deleteReport = async (id: number) => {
    const token = localStorage.getItem('access_token');
    await fetch(`${config.apiUrl}/reports/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchReports();
  };

  const totalPages = Math.ceil(total / limit);
  if (isLoading) return <LoadingSpinner />;
  return (
    <div className={styles.container}>
      <h1>Отчёты о проблемах</h1>

      <div className={styles.filters}>
        <input placeholder="Объект (label)" value={filters.node_label}
          onChange={e => { setFilters(prev => ({ ...prev, node_label: e.target.value })); setPage(0); }} />
        <input placeholder="ID клиента" value={filters.client_id}
          onChange={e => { setFilters(prev => ({ ...prev, client_id: e.target.value })); setPage(0); }} />
        <input placeholder="Имя клиента" value={filters.client_name}
          onChange={e => { setFilters(prev => ({ ...prev, client_name: e.target.value })); setPage(0); }} />
        <input placeholder="ID пользователя" value={filters.user_name}
          onChange={e => { setFilters(prev => ({ ...prev, user_name: e.target.value })); setPage(0); }} />
        <input type="datetime-local" value={filters.from_time}
          onChange={e => { setFilters(prev => ({ ...prev, from_time: e.target.value })); setPage(0); }} />
        <input type="datetime-local" value={filters.to_time}
          onChange={e => { setFilters(prev => ({ ...prev, to_time: e.target.value })); setPage(0); }} />
        <span>Всего: {total}</span>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Время</th>
              <th>Объект</th>
              <th>Клиент</th>
              <th>MAC</th>
              <th>Пользователь</th>
              <th>Описание</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString('ru-RU')}</td>
                <td>{r.node_label || '-'}</td>
                <td>{r.client_name} {r.client_id ? `(ID: ${r.client_id})` : ''}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8em' }}>{r.client_mac || '-'}</td>
                <td>{r.user_name} (ID: {r.user_id})</td>
                <td>{r.description}</td>
                <td><button onClick={() => deleteReport(r.id)} className={styles.closeBtn}>✕ Закрыть</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button>
          <span>{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>→</button>
        </div>
      )}
    </div>
  );
};