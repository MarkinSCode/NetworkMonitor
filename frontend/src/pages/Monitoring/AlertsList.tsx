import React, { useState, useEffect } from 'react';
import styles from './Monitoring.module.css';
import { config } from '../../config';
interface Alert {
  id: number;
  client_id: number;
  client_name: string;
  mac_address: string;
  type: string;
  severity: string;
  message: string;
  value: number;
  created_at: string;
  is_active: boolean;
}

interface AlertsListProps {
  refreshInterval: number;
  onClientClick: (clientId: number) => void;
}

export const AlertsList: React.FC<AlertsListProps> = ({ refreshInterval, onClientClick }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetchAlerts();
    if (refreshInterval < 1) return;
    const interval = setInterval(fetchAlerts, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.apiUrl}/monitoring/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки предупреждений:', err);
    }
  };

  const getSeverityColor = (severity: string) => severity === 'critical' ? '#e74c3c' : '#f39c12';
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cpu': return '⚠️';
      case 'memory': return '⚠️';
      case 'disk': return '⚠️';
      default: return '⚠️';
    }
  };

  return (
    <div className={styles.alertsSection}>
      <h2>Предупреждения ({alerts.length})</h2>
      <div className={styles.alertsList}>
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={styles.alertCard}
            style={{ borderLeftColor: getSeverityColor(alert.severity), cursor: 'pointer' }}
            onClick={() => onClientClick(alert.client_id)}
            title="Нажмите для просмотра"
          >
            <span className={styles.alertIcon}>{getTypeIcon(alert.type)}</span>
            <div className={styles.alertInfo}>
              <span className={styles.alertClient}>{alert.client_name}</span>
              <span className={styles.alertMac}>MAC: {alert.mac_address}</span>
              <span className={styles.alertMessage}>{alert.message}</span>
              <span className={styles.alertTime}>
                {new Date(alert.created_at).toLocaleString('ru-RU')}
              </span>
            </div>
            <span className={styles.alertSeverity} style={{ color: getSeverityColor(alert.severity) }}>
              {alert.severity === 'critical' ? 'Критическое' : 'Предупреждение'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};