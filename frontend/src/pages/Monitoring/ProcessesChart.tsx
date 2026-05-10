import React, { useState, memo, useMemo, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Process } from '../../types';
import styles from './Monitoring.module.css';

const DEFAULT_COLORS = [
  '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#7f8c8d', '#2c3e50',
  '#27ae60', '#c0392b', '#8e44ad', '#16a085', '#d35400',
  '#2980b9', '#f1c40f', '#e91e63', '#00bcd4', '#ff5722',
];

const PRESET_COLORS: Record<string, string> = {
  'chrome': '#3498db',
  'firefox': '#e67e22',
  'edge': '#2ecc71',
  'discord': '#7289da',
  'code': '#007acc',
  'explorer': '#f39c12',
  'spotify': '#1db954',
  'node': '#339933',
  'python': '#3776ab',
  'svchost': '#95a5a6',
};

interface ProcessesChartProps {
  processes: Process[];
  totalCount: number;
}

interface ChartDataItem {
  name: string;
  cpu: number;
  memory: number;
  pid: number;
  color?: string;
}

const colorCache = new Map<string, string>();
let colorCounter = 0;

const getAutoColor = (name: string): string => {
  const lower = name.toLowerCase().trim();
  for (const [key, color] of Object.entries(PRESET_COLORS)) {
    if (lower.includes(key)) return color;
  }
  if (colorCache.has(lower)) return colorCache.get(lower)!;
  const color = DEFAULT_COLORS[colorCounter % DEFAULT_COLORS.length];
  colorCounter++;
  colorCache.set(lower, color);
  return color;
};

export const ProcessesChart: React.FC<ProcessesChartProps> = memo(({ processes, totalCount }) => {
  const [viewMode, setViewMode] = useState<'bar' | 'pie' | 'donut'>('bar');
  const [metricType, setMetricType] = useState<'cpu' | 'memory'>('cpu');
  const [groupMode, setGroupMode] = useState<'separate' | 'grouped'>('separate');
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 600);

  React.useEffect(() => {
    const handler = () => setIsNarrow(window.innerWidth < 600);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const filteredProcesses = useMemo(() => {
    return processes.filter(p => 
      p.name && !p.name.toLowerCase().includes('system idle process') &&
      !p.name.toLowerCase().includes('idle')
    );
  }, [processes]);

  const chartData: ChartDataItem[] = useMemo(() => {
    if (groupMode === 'grouped') {
      // Режим 2: группировка одинаковых имён
      const grouped = new Map<string, { cpu: number; memory: number; pids: number[] }>();
      
      for (const p of filteredProcesses) {
        const name = (p.name || 'Unknown').length > 25 ? (p.name || 'Unknown').substring(0, 25) + '...' : (p.name || 'Unknown');
        const existing = grouped.get(name);
        if (existing) {
          existing.cpu += (p.cpu || 0);
          existing.memory += (p.memory || 0);
          existing.pids.push(p.pid || 0);
        } else {
          grouped.set(name, { cpu: p.cpu || 0, memory: p.memory || 0, pids: [p.pid || 0] });
        }
      }
      
      const result: ChartDataItem[] = Array.from(grouped.entries())
        .map(([name, data]) => ({
          name,
          cpu: Math.round(data.cpu * 10) / 10,
          memory: Math.round(data.memory * 10) / 10,
          pid: data.pids[0] || 0,
          color: customColors[name] || getAutoColor(name),
        }))
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 10);
      
      return result;
    }
    
    // Режим 1: все процессы раздельно
    const topProcesses: ChartDataItem[] = filteredProcesses.slice(0, 10).map(p => ({
      name: (p.name || 'Unknown').length > 25 ? (p.name || 'Unknown').substring(0, 25) + '...' : (p.name || 'Unknown'),
      cpu: Math.round((p.cpu || 0) * 10) / 10,
      memory: Math.round((p.memory || 0) * 10) / 10,
      pid: p.pid || 0,
    }));

    if (filteredProcesses.length > 10) {
      const otherCpu = filteredProcesses.slice(10).reduce((sum, p) => sum + (p.cpu || 0), 0);
      const otherMem = filteredProcesses.slice(10).reduce((sum, p) => sum + (p.memory || 0), 0);
      topProcesses.push({
        name: 'Остальные',
        cpu: Math.round(otherCpu * 10) / 10,
        memory: Math.round(otherMem * 10) / 10,
        pid: 0,
      });
    }

    return topProcesses;
  }, [filteredProcesses, groupMode, customColors]);

  const handleColorChange = (name: string, color: string) => {
    setCustomColors(prev => ({ ...prev, [name]: color }));
  };

  const getBarColor = (entry: ChartDataItem): string => {
    if (entry.name === 'Остальные') return '#bdc3c7';
    if (groupMode === 'grouped' && entry.color) return entry.color;
    return getAutoColor(entry.name);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem;
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{data.name}</p>
          {data.pid > 0 && <p className={styles.tooltipSubtext}>PID: {data.pid}</p>}
          <p className={styles.tooltipValue}>
            CPU: {data.cpu}% | Память: {data.memory}%
          </p>
        </div>
      );
    }
    return null;
  };

  const renderPieLabel = (props: { name?: string; percent?: number }) => {
    const { name = '', percent } = props;
    const pct = percent != null ? percent : 0;
    return `${name} (${(pct * 100).toFixed(0)}%)`;
  };

  const renderChart = () => {
    if (viewMode === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={chartData} 
            layout={isNarrow ? 'horizontal' : 'vertical'}
            margin={isNarrow 
              ? { top: 5, right: 30, left: 20, bottom: 25 }
              : { top: 5, right: 30, left: 100, bottom: 5 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
            {isNarrow ? (
              <>
                <XAxis dataKey="name" stroke="#7f8c8d" fontSize={10} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#7f8c8d" fontSize={12} />
              </>
            ) : (
              <>
                <XAxis type="number" stroke="#7f8c8d" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#7f8c8d" fontSize={11} width={90} />
              </>
            )}
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={metricType} name={metricType === 'cpu' ? 'CPU %' : 'Память %'} radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (viewMode === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={isNarrow ? undefined : renderPieLabel} outerRadius={isNarrow ? 70 : 100} fill="#8884d8" dataKey={metricType} nameKey="name">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={isNarrow ? 70 : 100} labelLine={false} label={isNarrow ? undefined : renderPieLabel} fill="#8884d8" dataKey={metricType} nameKey="name">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>Процессы (активных: {filteredProcesses.length}, всего: {totalCount})</h3>
        <div className={styles.chartControls}>
          <div className={styles.metricToggle}>
            <button className={`${styles.smallButton} ${metricType === 'cpu' ? styles.active : ''}`} onClick={() => setMetricType('cpu')}>CPU</button>
            <button className={`${styles.smallButton} ${metricType === 'memory' ? styles.active : ''}`} onClick={() => setMetricType('memory')}>Память</button>
          </div>
          <div className={styles.metricToggle}>
            <button className={`${styles.smallButton} ${groupMode === 'separate' ? styles.active : ''}`} onClick={() => setGroupMode('separate')}>Раздельно</button>
            <button className={`${styles.smallButton} ${groupMode === 'grouped' ? styles.active : ''}`} onClick={() => setGroupMode('grouped')}>Группировать</button>
          </div>
          <div className={styles.viewToggle}>
            <button className={`${styles.smallButton} ${viewMode === 'bar' ? styles.active : ''}`} onClick={() => setViewMode('bar')} title="Столбчатая">▊</button>
            <button className={`${styles.smallButton} ${viewMode === 'pie' ? styles.active : ''}`} onClick={() => setViewMode('pie')} title="Круговая">◯</button>
            <button className={`${styles.smallButton} ${viewMode === 'donut' ? styles.active : ''}`} onClick={() => setViewMode('donut')} title="Кольцевая">◎</button>
          </div>
        </div>
      </div>
      
      {/* Палитра цветов для группированного режима */}
      {groupMode === 'grouped' && chartData.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 12,
          padding: '8px 0',
        }}>
          {chartData.filter(d => d.name !== 'Остальные').map(d => (
            <div key={d.name} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.75em',
            }}>
              <input
                type="color"
                value={d.color || getAutoColor(d.name)}
                onChange={e => handleColorChange(d.name, e.target.value)}
                style={{ width: 18, height: 18, border: 'none', cursor: 'pointer', padding: 0 }}
                title={d.name}
              />
              <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
            </div>
          ))}
        </div>
      )}
      
      {renderChart()}
    </div>
  );
});