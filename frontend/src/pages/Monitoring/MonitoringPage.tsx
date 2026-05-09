import React, { useState, useEffect, useCallback, useRef } from 'react';
import { monitoringService } from '../../services/monitoring.service';
import { Client, MonitorSummary } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ClientCard } from './ClientCard';
import { ClientDetailPanel } from './ClientDetailPanel';
import styles from './Monitoring.module.css';
import { AlertsList } from './AlertsList';
import { useAuth } from '../../hooks/useAuth';
import { config } from '../../config';
import ReactDOM from 'react-dom';

export const MonitoringPage: React.FC = () => {
  const [summary, setSummary] = useState<MonitorSummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [inputValue, setInputValue] = useState('60');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteClientIds, setDeleteClientIds] = useState<number[]>([]);
  const [deleteFromTime, setDeleteFromTime] = useState('');
  const [deleteToTime, setDeleteToTime] = useState('');
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFirstRender = useRef(true);
  

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, clientsData, settingsData] = await Promise.all([
        monitoringService.getSummary(),
        monitoringService.getClients(),
        monitoringService.getMonitorSettings(),
      ]);

      setSummary(summaryData);
      setClients(clientsData);
      
      if (isFirstRender.current) {
        setRefreshInterval(settingsData.collect_interval);
        setInputValue(String(settingsData.collect_interval));
        isFirstRender.current = false;
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setupInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (refreshInterval >= 1) {
      intervalRef.current = setInterval(fetchData, refreshInterval * 1000);
    }
  }, [refreshInterval, fetchData]);

  useEffect(() => {
    fetchData();
    setupInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setupInterval]);


  useEffect(() => {
    const statusInterval = setInterval(async () => {
      try {
        const clientsData = await monitoringService.getClients();
        setClients(clientsData);
      } catch (err) {
        console.error('Ошибка обновления статуса:', err);
      }
    }, Math.min(refreshInterval * 1000, 30000));
    
    return () => clearInterval(statusInterval);
  }, [refreshInterval]);


  const handleIntervalChange = (value: string) => {
    setInputValue(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 60) {
      setRefreshInterval(numValue);
      monitoringService.updateMonitorInterval(numValue).catch(console.error);
    }
  };

  const handleIntervalBlur = () => {
    const numValue = parseInt(inputValue);
    if (isNaN(numValue) || numValue < 1 || numValue > 60) {
      setInputValue(String(refreshInterval));
    }
  };
  const handleDeleteClient = async (clientId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${config.apiUrl}/monitoring/clients/${clientId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Ошибка удаления клиента:', err);
    }
  };
  const handleDeleteMetrics = async () => {
    const token = localStorage.getItem('access_token');
    const body: any = {};
    if (deleteClientIds.length > 0) body.client_ids = deleteClientIds;
    if (deleteFromTime) body.from_time = deleteFromTime;
    if (deleteToTime) body.to_time = deleteToTime;

    const res = await fetch('${config.apiUrl}/monitoring/metrics', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    alert(data.message);
    setShowDeleteModal(false);
    fetchData();
  };

  if (selectedClientId) {
  return (
    <ClientDetailPanel 
      clientId={selectedClientId} 
      onBack={() => setSelectedClientId(null)} 
      refreshInterval={refreshInterval}
    />
  );
}
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1>Мониторинг сети</h1>
        <div className={styles.refreshControl}>
          <span className={styles.refreshLabel}>Интервал:</span>
          <input
            type="number"
            className={styles.refreshInput}
            value={inputValue}
            onChange={(e) => handleIntervalChange(e.target.value)}
            onBlur={handleIntervalBlur}
            min="1"
            max="60"
          />
          <span className={styles.refreshUnit}>сек</span>
          {user?.is_admin && (
            <button className={styles.deleteBtn} onClick={() => setShowDeleteModal(true)}>
              🗑 Очистить метрики
            </button>
          )}
        </div>
      </div>

      {showDeleteModal && ReactDOM.createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3>Удаление записей мониторинга</h3>
            
            <label>Клиенты</label>
            <select
              multiple
              className={styles.selectMultiple}
              value={deleteClientIds.map(String)}
              onChange={e => setDeleteClientIds(Array.from(e.target.selectedOptions, o => Number(o.value)))}
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.display_name || c.hostname} (ID: {c.id})</option>
              ))}
            </select>
            
            <div style={{ display: 'flex', gap: 10, margin: '15px 0' }}>
              <div>
                <label>С</label>
                <input type="datetime-local" className={styles.dateInput} value={deleteFromTime}
                  onChange={e => setDeleteFromTime(e.target.value)} />
              </div>
              <div>
                <label>По</label>
                <input type="datetime-local" className={styles.dateInput} value={deleteToTime}
                  onChange={e => setDeleteToTime(e.target.value)} />
              </div>
            </div>

            <p className={styles.warning}>
              Внимание! Если не выбрать ни клиента, ни даты — удалятся все записи.
            </p>

            <div className={styles.actions}>
              <button onClick={handleDeleteMetrics} className={styles.deleteBtn}>Удалить</button>
              <button onClick={() => setShowDeleteModal(false)} className={styles.cancelBtn}>Отмена</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {summary && (
        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <h3>Всего устройств</h3>
            <p className={styles.value}>{summary.total_clients}</p>
          </div>
          <div className={styles.summaryCard}>
            <h3>Активных</h3>
            <p className={styles.value} style={{ color: '#2ecc71' }}>{summary.active_clients}</p>
          </div>
          <div className={styles.summaryCard}>
            <h3>Офлайн</h3>
            <p className={styles.value} style={{ color: '#e74c3c' }}>
              {clients.filter(c => !c.is_active).length}
            </p>
          </div>
          <div className={styles.summaryCard}>
            <h3>Средняя CPU</h3>
            <p className={styles.value}>{summary.average_cpu}%</p>
          </div>
          <div className={styles.summaryCard}>
            <h3>Средняя память</h3>
            <p className={styles.value}>{summary.average_memory}%</p>
          </div>
          <div className={styles.summaryCard}>
            <h3>Предупреждения</h3>
            <p className={styles.value} style={{ color: summary.alerts > 0 ? '#e74c3c' : '#2ecc71' }}>
              {summary.alerts}
            </p>
          </div>
        </div>
      )}
      <AlertsList 
        refreshInterval={refreshInterval} 
        onClientClick={setSelectedClientId}
      />
      <div className={styles.clientsSection}>
        <h2>Устройства ({clients.length})</h2>
        <div className={styles.clientGrid}>
          {clients.map((client) => (
            <ClientCard 
            key={client.id} 
            client={client} 
            onClick={() => setSelectedClientId(client.id)} 
            onDelete={user?.is_admin ? handleDeleteClient : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
};