import React, { useState, useEffect, useRef } from 'react';
import { Client } from '../../types';
import { config } from '../../config';

export const ComputerNode: React.FC<{ data: any; selected: boolean }> = ({ data, selected }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [clientData, setClientData] = useState<Client | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!data.clientId) return;

    const fetchData = () => {
      const token = localStorage.getItem('access_token');
      fetch(`${config.apiUrl}/monitoring/clients/${data.clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setClientData(data);
          forceUpdate(n => n + 1);
        })
        .catch(console.error);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [data.clientId]);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => setShowPreview(true), 300);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowPreview(false);
  };

  const getBorderColor = () => {
    if (!data.clientId) return 'var(--warning)';
    if (!clientData) return 'var(--warning)';
    if (!clientData.is_active) return 'var(--danger)';
    return 'var(--success)';
  };

  const isMetricsFresh = () => {
    if (!clientData?.latest_metrics?.timestamp) return false;
    const age = Date.now() - new Date(clientData.latest_metrics.timestamp).getTime();
    return age < 120000;
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative' }}
    >
      <div style={{
        padding: 8,
        background: 'var(--bg-card)',
        border: `2px solid ${getBorderColor()}`,
        borderRadius: 8,
        minWidth: 80,
        textAlign: 'center',
        boxShadow: selected ? '0 0 0 2px var(--accent)' : '0 2px 6px var(--shadow)',
        position: 'relative',
        zIndex: selected ? 30 : 20,
        cursor: 'pointer',
      }}>
        <div style={{ fontSize: 22, marginBottom: 2 }}>🖥️</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{data.label}</div>
        {data.owner && <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 1 }}>{data.owner}</div>}
      </div>

      {showPreview && data.clientId && clientData && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          marginTop: 8,
          padding: 14,
          minWidth: 210,
          background: 'var(--bg-card)',
          borderRadius: 8,
          boxShadow: '0 4px 12px var(--shadow)',
          border: '1px solid var(--border)',
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: clientData.is_active ? 'var(--success)' : 'var(--danger)',
              flexShrink: 0
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {clientData.display_name || clientData.hostname || clientData.mac_address}
            </span>
          </div>
          
          {clientData.os_info && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {clientData.os_info}
            </div>
          )}
          
          {clientData.is_active && isMetricsFresh() && clientData.latest_metrics && (
            <>
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>CPU</div>
                  <div style={{ 
                    fontSize: 16, fontWeight: 700,
                    color: clientData.latest_metrics.cpu_percent > 90 ? '#e74c3c' :
                           clientData.latest_metrics.cpu_percent > 70 ? '#f39c12' : '#2ecc71'
                  }}>
                    {clientData.latest_metrics.cpu_percent}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>RAM</div>
                  <div style={{ 
                    fontSize: 16, fontWeight: 700,
                    color: clientData.latest_metrics.memory_percent > 90 ? '#e74c3c' :
                           clientData.latest_metrics.memory_percent > 80 ? '#f39c12' : '#3498db'
                  }}>
                    {clientData.latest_metrics.memory_percent}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Диск</div>
                  <div style={{ 
                    fontSize: 16, fontWeight: 700,
                    color: clientData.latest_metrics.disk_percent > 90 ? '#e74c3c' : '#9b59b6'
                  }}>
                    {clientData.latest_metrics.disk_percent}%
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>
                {new Date(clientData.latest_metrics.timestamp).toLocaleTimeString('ru-RU')}
              </div>
            </>
          )}

          {!clientData.is_active && (
            <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 6 }}>
              Устройство не в сети
            </div>
          )}
        </div>
      )}
    </div>
  );
};
