import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { monitoringService } from '../../services/monitoring.service';
import { ClientDetail, MetricsHistory } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CpuCoresChart } from './CpuCoresChart';
import { ProcessesChart } from './ProcessesChart';
import styles from './Monitoring.module.css';
import { config } from '../../config';
interface ClientDetailPanelProps {
  clientId: number;
  onBack: () => void;
  refreshInterval: number;
}

export const ClientDetailPanel: React.FC<ClientDetailPanelProps> = ({ clientId, onBack, refreshInterval }) => {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [history, setHistory] = useState<MetricsHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [activeTab, setActiveTab] = useState<'history' | 'realtime'>('realtime');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const computerName = client?.display_name || client?.hostname || client?.mac_address || 'Неизвестный компьютер';
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isLoadingScreenshot, setIsLoadingScreenshot] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const fetchClientData = useCallback(async () => {
    try {
      const [clientData, historyData] = await Promise.all([
        monitoringService.getClientDetail(clientId),
        activeTab === 'history' 
          ? monitoringService.getClientHistory(clientId, getFromTime(), new Date().toISOString())
          : Promise.resolve([]),
      ]);

      setClient(clientData);
      if (activeTab === 'history') {
        setHistory(historyData);
      }
    } catch (err) {
      console.error('Ошибка загрузки данных клиента:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, timeRange, activeTab]);

  useEffect(() => {
    fetchClientData();
    if (refreshInterval < 1) return;
    const interval = setInterval(fetchClientData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchClientData, refreshInterval]);

  const handleStartEditName = () => {
    setEditName(computerName);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (editName.trim() && editName !== computerName) {
      try {
        await monitoringService.updateClientName(clientId, editName.trim());
        setClient(prev => prev ? {
          ...prev,
          display_name: editName.trim()
        } : null);
      } catch (err) {
        console.error('Ошибка обновления имени:', err);
      }
    }
    setIsEditingName(false);
  };
  const handleScreenshot = async () => {
    if (screenshot) {
      setShowScreenshot(!showScreenshot);
      return;
    }
    
    setIsLoadingScreenshot(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${config.apiUrl}/monitoring/screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ client_id: clientId })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.image) {
          setScreenshot(data.image);
          setShowScreenshot(true);
        } else {
          console.error('Скриншот не получен:', data);
        }
      } else {
        const error = await response.json().catch(() => ({ detail: 'Неизвестная ошибка' }));
        console.error('Ошибка сервера:', error.detail);
      }
    } catch (err) {
      console.error('Ошибка скриншота:', err);
    } finally {
      setIsLoadingScreenshot(false);
    }
  };

  const openFullscreen = () => {
    setShowFullscreen(true);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const getFromTime = (): string => {
    const now = new Date();
    switch (timeRange) {
      case '1h': return new Date(now.getTime() - 3600000).toISOString();
      case '6h': return new Date(now.getTime() - 21600000).toISOString();
      case '24h': return new Date(now.getTime() - 86400000).toISOString();
      case '7d': return new Date(now.getTime() - 604800000).toISOString();
      default: return new Date(now.getTime() - 86400000).toISOString();
    }
  };

  const formatChartData = (data: MetricsHistory[]) => {
    return data.map((point) => ({
      ...point,
      time: new Date(point.timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
  };

  const getMetricColor = (value: number, type: 'cpu' | 'memory' | 'disk'): string => {
    if (value > 90) return '#e74c3c';
    if (value > 70) return '#f39c12';
    return type === 'cpu' ? '#2ecc71' : type === 'memory' ? '#3498db' : '#9b59b6';
  };



  const chartData = useMemo(() => formatChartData(history), [history]);
  if (isLoading && !client) return <LoadingSpinner />;
  const latestMetrics = client?.latest_metrics;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button onClick={onBack} className={styles.backButton}>← Назад к списку</button>
      </div>

      {client && (
        <>
          <div className={styles.clientHeader}>
            <div>
              <div className={styles.nameRow}>
                {isEditingName ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleKeyDown}
                    className={styles.nameInput}
                    autoFocus
                  />
                ) : (
                  <h1 onClick={handleStartEditName} title="Нажмите чтобы изменить имя">
                    {computerName}
                    <span className={styles.editIcon}> ✎</span>
                  </h1>
                )}
              <div className={styles.statusBadge}>
                <span className={`${styles.statusDot} ${client.is_active ? styles.online : styles.offline}`}>
                  {client.is_active && <span className={styles.pulse} />}
                </span>
                {client.is_active ? 'Online' : 'Offline'}
              </div>
              </div>
              <p className={styles.clientMeta}>
                ОС: {client.os_info || 'Неизвестно'}
                {client.mac_address && ` | MAC: ${client.mac_address}`}
                {client.hostname && ` | Hostname: ${client.hostname}`}
                {latestMetrics?.cpu_model && ` | CPU: ${latestMetrics.cpu_model}`}
                {latestMetrics?.cpu_frequency && ` | ${latestMetrics.cpu_frequency} MHz`}
              </p>
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tabButton} ${activeTab === 'realtime' ? styles.active : ''}`}
              onClick={() => setActiveTab('realtime')}
            >
              Текущее состояние
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`}
              onClick={() => setActiveTab('history')}
            >
              История метрик
            </button>
            <button 
              onClick={handleScreenshot} 
              className={styles.tabButton}
              disabled={isLoadingScreenshot}
            >
              {isLoadingScreenshot ? 'Загрузка...' : '📸 Скриншот'}
            </button>
          </div>

          <div className={styles.screenshotWrapper}>
            <div className={`${styles.screenshotPanel} ${showScreenshot && screenshot ? styles.screenshotOpen : ''}`}>
              {screenshot && (
                <img 
                  src={`data:image/jpeg;base64,${screenshot}`} 
                  alt="Скриншот" 
                  className={styles.screenshotPreview}
                  onClick={openFullscreen}
                  title="Нажмите для увеличения"
                />
              )}
            </div>
          </div>


          {showFullscreen && screenshot && (
            <div className={styles.fullscreen} onClick={() => setShowFullscreen(false)}>
              <img src={`data:image/jpeg;base64,${screenshot}`} alt="Скриншот" onClick={e => e.stopPropagation()} />
            </div>
          )}

          {activeTab === 'realtime' && latestMetrics && client?.is_active && (
            <>
              <div className={styles.currentMetrics}>
                <div className={styles.metricCard}>
                  <h3>CPU</h3>
                  <div className={styles.metricValue} style={{ color: getMetricColor(latestMetrics.cpu_percent, 'cpu') }}>
                    {latestMetrics.cpu_percent}%
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${latestMetrics.cpu_percent}%`,
                        backgroundColor: getMetricColor(latestMetrics.cpu_percent, 'cpu'),
                      }}
                    />
                  </div>
                </div>
                <div className={styles.metricCard}>
                  <h3>Память</h3>
                  <div className={styles.metricValue} style={{ color: getMetricColor(latestMetrics.memory_percent, 'memory') }}>
                    {latestMetrics.memory_percent}%
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${latestMetrics.memory_percent}%`,
                        backgroundColor: getMetricColor(latestMetrics.memory_percent, 'memory'),
                      }}
                    />
                  </div>
                </div>
                <div className={styles.metricCard}>
                  <h3>Диск</h3>
                  <div className={styles.metricValue} style={{ color: getMetricColor(latestMetrics.disk_percent, 'disk') }}>
                    {latestMetrics.disk_percent}%
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${latestMetrics.disk_percent}%`,
                        backgroundColor: getMetricColor(latestMetrics.disk_percent, 'disk'),
                      }}
                    />
                  </div>
                </div>
              </div>

              {latestMetrics.cpu_cores && latestMetrics.cpu_cores.length > 0 && (
                <CpuCoresChart cores={latestMetrics.cpu_cores} />
              )}

              {latestMetrics.processes && latestMetrics.processes.length > 0 && (
                <ProcessesChart 
                  processes={latestMetrics.processes} 
                  totalCount={latestMetrics.total_processes || 0} 
                />
              )}
            </>
          )}

          {activeTab === 'history' && (
            <>
              <div className={styles.timeRangeSelector}>
                <button className={`${styles.timeButton} ${timeRange === '1h' ? styles.active : ''}`} onClick={() => setTimeRange('1h')}>1 час</button>
                <button className={`${styles.timeButton} ${timeRange === '6h' ? styles.active : ''}`} onClick={() => setTimeRange('6h')}>6 часов</button>
                <button className={`${styles.timeButton} ${timeRange === '24h' ? styles.active : ''}`} onClick={() => setTimeRange('24h')}>24 часа</button>
                <button className={`${styles.timeButton} ${timeRange === '7d' ? styles.active : ''}`} onClick={() => setTimeRange('7d')}>7 дней</button>
              </div>

              {chartData.length === 0 ? (
                <div className={styles.emptyState}><p>Нет данных за выбранный период</p></div>
              ) : (
                <div className={styles.charts}>
                  <div className={styles.chartContainer}>
                    <h3>Загрузка CPU</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2ecc71" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
                        <XAxis dataKey="time" stroke="#7f8c8d" fontSize={12} />
                        <YAxis stroke="#7f8c8d" fontSize={12} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#2c3e50', border: 'none', borderRadius: '4px', color: '#fff' }} />
                        <Area type="monotone" dataKey="cpu_percent" isAnimationActive={false} stroke="#2ecc71" fill="url(#cpuGradient)" strokeWidth={2} name="CPU %" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={styles.chartContainer}>
                    <h3>Использование памяти</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3498db" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3498db" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
                        <XAxis dataKey="time" stroke="#7f8c8d" fontSize={12} />
                        <YAxis stroke="#7f8c8d" fontSize={12} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#2c3e50', border: 'none', borderRadius: '4px', color: '#fff' }} />
                        <Area type="monotone" dataKey="memory_percent" isAnimationActive={false} stroke="#3498db" fill="url(#memGradient)" strokeWidth={2} name="Память %" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={styles.chartContainer}>
                    <h3>Загрузка диска</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="diskGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#9b59b6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#9b59b6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
                        <XAxis dataKey="time" stroke="#7f8c8d" fontSize={12} />
                        <YAxis stroke="#7f8c8d" fontSize={12} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#2c3e50', border: 'none', borderRadius: '4px', color: '#fff' }} />
                        <Area type="monotone" dataKey="disk_percent" isAnimationActive={false} stroke="#9b59b6" fill="url(#diskGradient)" strokeWidth={2} name="Диск %" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

    </div>
  );
};