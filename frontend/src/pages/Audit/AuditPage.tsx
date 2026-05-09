import React, { useState, useEffect } from 'react';
import { auditService, AuditLog, AuditFilters } from '../../services/audit.service';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import styles from './Audit.module.css';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<AuditFilters>({
    user_id: '',
    user_name: '',
    action: '',
    description: '',
    from_time: '',
    to_time: '',
  });
  const limit = 50;

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getLogs({
        ...filters,
        limit,
        offset: page * limit,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error('Ошибка загрузки аудита:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({
      user_id: '',
      user_name: '',
      action: '',
      description: '',
      from_time: '',
      to_time: '',
    });
    setPage(0);
  };

  const getActionColor = (action: string): string => {
    if (action.includes('LOGIN') || action.includes('REGISTRATION')) return '#3498db';
    if (action.includes('FAILED') || action.includes('DENIED') || action.includes('BLOCKED')) return '#e74c3c';
    if (action.includes('DELETE') || action.includes('DELETED')) return '#e74c3c';
    if (action.includes('SUCCESS')) return '#2ecc71';
    if (action.includes('APPROVED') || action.includes('UNBLOCKED')) return '#2ecc71';
    return '#7f8c8d';
  };

  const totalPages = Math.ceil(total / limit);
  const hasFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className={styles.container}>
      <h1>Аудит действий</h1>
      
      <div className={styles.filters}>
        <div className={styles.filterRow}>
          <input
            type="text"
            placeholder="ID пользователя"
            value={filters.user_id}
            onChange={(e) => handleFilterChange('user_id', e.target.value)}
            className={styles.filterInput}
          />
          <input
            type="text"
            placeholder="ФИО"
            value={filters.user_name}
            onChange={(e) => handleFilterChange('user_name', e.target.value)}
            className={styles.filterInput}
          />
          <input
            type="text"
            placeholder="Действие"
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className={styles.filterInput}
          />
          <input
            type="text"
            placeholder="Описание"
            value={filters.description}
            onChange={(e) => handleFilterChange('description', e.target.value)}
            className={styles.filterInput}
          />
        </div>
        <div className={styles.filterRow}>
          <label className={styles.filterLabel}>
            С: 
            <input
              type="datetime-local"
              value={filters.from_time}
              onChange={(e) => handleFilterChange('from_time', e.target.value)}
              className={styles.filterDate}
            />
          </label>
          <label className={styles.filterLabel}>
            По:
            <input
              type="datetime-local"
              value={filters.to_time}
              onChange={(e) => handleFilterChange('to_time', e.target.value)}
              className={styles.filterDate}
            />
          </label>
          {hasFilters && (
            <button onClick={handleClearFilters} className={styles.clearBtn}>
              ✕ Сбросить
            </button>
          )}
        </div>
        <span className={styles.total}>Всего записей: {total}</span>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Время</th>
                  <th>ID</th>
                  <th>Пользователь</th>
                  <th>Действие</th>
                  <th>Описание</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.time}>
                      {new Date(log.timestamp).toLocaleString('ru-RU')}
                    </td>
                    <td className={styles.id}>{log.user_id || '-'}</td>
                    <td>{log.user_name}</td>
                    <td>
                      <span
                        className={styles.actionBadge}
                        style={{ backgroundColor: getActionColor(log.action) }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className={styles.description}>{log.description || '-'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className={styles.empty}>Записей не найдено</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                ← Назад
              </button>
              <span>Страница {page + 1} из {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};