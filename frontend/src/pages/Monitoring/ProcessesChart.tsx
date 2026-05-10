import React, { useState, memo, useMemo } from 'react';
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

interface ProcessesChartProps {
  processes: Process[];
  totalCount: number;
}

interface ChartDataItem {
  name: string;
  cpu: number;
  memory: number;
  pid: number;
}

const loadSavedColors = (): Record<string, string> => {
  try {
    const saved = localStorage.getItem('process-colors');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveColors = (colors: Record<string, string>) => {
  localStorage.setItem('process-colors', JSON.stringify(colors));
};

const colorIndexMap = new Map<string, number>();
let globalColorIndex = 0;

const getColorForIndex = (index: number): string => {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
};

export const ProcessesChart: React.FC<ProcessesChartProps> = memo(({ processes, totalCount }) => {
  const [viewMode, setViewMode] = useState<'bar' | 'pie' | 'donut'>('bar');
  const [metricType, setMetricType] = useState<'cpu' | 'memory'>('cpu');
  const [groupMode, setGroupMode] = useState<'separate' | 'grouped'>('separate');
  const [processLimit, setProcessLimit] = useState(10);
  const [savedColors, setSavedColors] = useState<Record<string, string>>(loadSavedColors);
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

  const uniqueNames = useMemo(() => {
    const names = new Set<string>();
    for (const p of filteredProcesses) {
      const name = (p.name || 'Unknown').length > 25 ? (p.name || 'Unknown').substring(0, 25) + '...' : (p.name || 'Unknown');
      names.add(name);
    }
    return Array.from(names);
  }, [filteredProcesses]);

  const getColor = (name: string): string => {
    if (savedColors[name]) return savedColors[name];
    if (!colorIndexMap.has(name)) {
      colorIndexMap.set(name, globalColorIndex++);
    }
    return getColorForIndex(colorIndexMap.get(name)!);
  };

  const chartData: ChartDataItem[] = useMemo(() => {
    if (groupMode === 'grouped') {
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
      
      const result = Array.from(grouped.entries())
        .map(([name, data]) => ({
          name,
          cpu: Math.round(data.cpu * 10) / 10,
          memory: Math.round(data.memory * 10) / 10,
          pid: data.pids[0] || 0,
        }))
        .sort((a, b) => b.cpu - a.cpu);

      if (result.length > processLimit) {
        const otherCpu = result.slice(processLimit).reduce((sum, p) => sum + p.cpu, 0);
        const otherMem = result.slice(processLimit).reduce((sum, p) => sum + p.memory, 0);
        return [
          ...result.slice(0, processLimit),
          { name: 'Остальные', cpu: Math.round(otherCpu * 10) / 10, memory: Math.round(otherMem * 10) / 10, pid: 0 }
        ];
      }
      return result;
    }
    
    const topProcesses: ChartDataItem[] = filteredProcesses.slice(0, processLimit).map(p => ({
      name: (p.name || 'Unknown').length > 25 ? (p.name || 'Unknown').substring(0, 25) + '...' : (p.name || 'Unknown'),
      cpu: Math.round((p.cpu || 0) * 10) / 10,
      memory: Math.round((p.memory || 0) * 10) / 10,
      pid: p.pid || 0,
    }));

    if (filteredProcesses.length > processLimit) {
      const otherCpu = filteredProcesses.slice(processLimit).reduce((sum, p) => sum + (p.cpu || 0), 0);
      const otherMem = filteredProcesses.slice(processLimit).reduce((sum, p) => sum + (p.memory || 0), 0);
      topProcesses.push({
        name: 'Остальные',
        cpu: Math.round(otherCpu * 10) / 10,
        memory: Math.round(otherMem * 10) / 10,
        pid: 0,
      });
    }

    return topProcesses;
  }, [filteredProcesses, groupMode, processLimit]);

  const handleColorChange = (name: string, color: string) => {
    const updated = { ...savedColors, [name]: color };
    setSavedColors(updated);
    saveColors(updated);
  };

  const getBarColor = (entry: ChartDataItem): string => {
    if (entry.name === 'Остальные') return '#bdc3c7';
    return getColor(entry.name);
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
            <Pie data={chartData} cx="50%" cy="50%" isAnimationActive={false} labelLine={false} label={isNarrow ? undefined : renderPieLabel} outerRadius={isNarrow ? 70 : 100} fill="#8884d8" dataKey={metricType} nameKey="name">
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
          <Pie data={chartData} cx="50%" cy="50%" isAnimationActive={false} innerRadius={40} outerRadius={isNarrow ? 70 : 100} labelLine={false} label={isNarrow ? undefined : renderPieLabel} fill="#8884d8" dataKey={metricType} nameKey="name">
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8em' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Показать:</span>
            <input
              type="number"
              value={processLimit}
              onChange={e => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 1 && v <= 10) setProcessLimit(v);
              }}
              min={1}
              max={10}
              style={{
                width: 40,
                height: 28,
                padding: '2px 4px',
                border: '1px solid var(--border-input)',
                borderRadius: 3,
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                textAlign: 'center',
              }}
            />
          </div>
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
      
      {uniqueNames.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 10,
          padding: '6px 0',
        }}>
          {uniqueNames.map(name => (
            <div key={name} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.72em',
            }}>
              <input
                type="color"
                value={savedColors[name] || getColor(name)}
                onChange={e => handleColorChange(name, e.target.value)}
                style={{ width: 16, height: 16, border: 'none', cursor: 'pointer', padding: 0 }}
                title={name}
              />
              <span style={{ color: 'var(--text-secondary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {renderChart()}
    </div>
  );
});