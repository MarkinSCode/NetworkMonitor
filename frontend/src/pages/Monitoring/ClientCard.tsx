import React from 'react';
import { Client } from '../../types';
import styles from './Monitoring.module.css';

interface ClientCardProps {
  client: Client;
  onClick: () => void;
  onDelete?: (clientId: number) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({ client, onClick, onDelete }) => {
  const computerName = client.display_name || client.hostname || client.mac_address || 'Неизвестный компьютер';
  const isOnline = client.is_active;
  const lastSeen = client.last_seen ? new Date(client.last_seen) : null;
  const timeAgo = lastSeen ? getTimeAgo(lastSeen) : 'никогда';
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Удалить "${computerName}" из мониторинга? Все метрики будут удалены.`)) {
      onDelete?.(client.id);
    }
  };
  const cpuLoad = client.latest_metrics?.cpu_percent ?? 0;
  const memLoad = client.latest_metrics?.memory_percent ?? 0;
  
  const getColor = (value: number) => {
    if (value > 90) return '#e74c3c';
    if (value > 70) return '#f39c12';
    return '#2ecc71';
  };
  
  return (
    <div
      className={`${styles.clientCard} ${isOnline ? styles.active : styles.inactive}`}
      onClick={onClick}
    >
      {onDelete && (
        <button className={styles.deleteClientBtn} onClick={handleDelete} title="Удалить клиента">
          ✕
        </button>
      )}
      <div className={styles.clientStatus}>
        <span className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`}>
          {isOnline && <span className={styles.pulse} />}
        </span>
        <span className={isOnline ? styles.statusOnline : styles.statusOffline}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      <h4>{computerName}</h4>
      <p className={styles.osInfo}>{client.os_info || 'Неизвестная ОС'}</p>
      
      {client.mac_address && (
        <p className={styles.macAddress}>MAC: {client.mac_address}</p>
      )}

      {isOnline && (
        <div className={styles.loadBars}>
          <div className={styles.loadRow}>
            <span className={styles.loadLabel}>CPU</span>
            <div className={styles.loadBarBg}>
              <div 
                className={styles.loadBarFill} 
                style={{ width: `${cpuLoad}%`, backgroundColor: getColor(cpuLoad) }}
              />
            </div>
            <span className={styles.loadValue} style={{ color: getColor(cpuLoad) }}>{cpuLoad}%</span>
          </div>
          <div className={styles.loadRow}>
            <span className={styles.loadLabel}>RAM</span>
            <div className={styles.loadBarBg}>
              <div 
                className={styles.loadBarFill} 
                style={{ width: `${memLoad}%`, backgroundColor: getColor(memLoad) }}
              />
            </div>
            <span className={styles.loadValue} style={{ color: getColor(memLoad) }}>{memLoad}%</span>
          </div>
        </div>
      )}

      <p className={styles.lastSeen}>
        {isOnline ? 'В сети' : `Не в сети: ${timeAgo}`}
      </p>
    </div>
  );
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'только что';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч назад`;
  return `${Math.floor(seconds / 86400)} дн назад`;
}