import React, { useState, useEffect, useCallback  } from 'react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import styles from './Settings.module.css';
import { config } from '../../config';

interface ServerInfo {
  hostname: string;
  ip: string;
  port: number;
  ws_port: number;
}

interface ProjectSettings {
  server: ServerInfo;
  agent_secret: string;
  is_open: boolean;
}

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [agentSecret, setAgentSecret] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);
  const token = localStorage.getItem('access_token');

  const fetchSettings = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${config.apiUrl}/settings/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      setAgentSecret(data.agent_secret);
      setIsOpen(data.is_open);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async () => {
    await fetch(`${config.apiUrl}/settings/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ agent_secret: agentSecret, is_open: isOpen })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) return <LoadingSpinner />;

  return (
    <div className={styles.container}>
      <h1>Настройки проекта</h1>

      <div className={styles.card}>
        <h3>Безопасность</h3>
        <div className={styles.row}>
          <span className={styles.label}>AGENT_SECRET:</span>
          <div className={styles.secretRow}>
            <input
              type={showSecret ? 'text' : 'password'}
              value={agentSecret}
              onChange={e => setAgentSecret(e.target.value)}
              className={styles.input}
            />
            <button onClick={() => setShowSecret(!showSecret)} className={styles.toggleBtn}>
              {showSecret ? '❌' : '👁'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3>Доступ</h3>
        <div className={styles.row}>
          <span className={styles.label}>Открыть доступ не администраторам:</span>
          <label className={styles.switch}>
            <input type="checkbox" checked={isOpen} onChange={e => setIsOpen(e.target.checked)} />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>
      <div className={styles.card}>
        <h3>Подключение</h3>
        <div className={styles.row}>
          <span className={styles.label}>Адрес сервера:</span>
          <code>{config.apiUrl}</code>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Адрес фронтенда:</span>
          <code>{window.location.origin}</code>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Адрес для агентов:</span>
          <code>{config.apiUrl.replace(/^https?:/, 'wss:').replace('/api/v1', '/ws/agent')}</code>
        </div>
      </div>
      <button onClick={saveSettings} className={styles.saveBtn}>
        Сохранить настройки
      </button>
      {saved && <span className={styles.savedMsg}>Сохранено</span>}
    </div>
  );
};
