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

// Предопределённые цвета для известных процессов
const PROCESS_COLORS: Record<string, string> = {
  'chrome': '#3498db',
  'firefox': '#e67e22',
  'edge': '#2ecc71',
  'discord': '#7289da',
  'telegram': '#0088cc',
  'code': '#007acc',
  'explorer': '#f39c12',
  'spotify': '#1db954',
  'node': '#339933',
  'python': '#3776ab',
  'java': '#e76f00',
  'svchost': '#95a5a6',
  'system': '#e74c3c',
  'taskmgr': '#2c3e50',
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
}

// Хранилище назначенных цветов (сохраняется между рендерами)
const colorMap = new Map<string, string>();
let colorIndex = 0;

const getColorForProcess = (name: string): string => {
  const lowerName = name.toLowerCase().trim();
  
  // Проверяем предопределённые цвета
  for (const [key, color] of Object.entries(PROCESS_COLORS)) {
    if (lowerName.includes(key)) return color;
  }
  
  // Проверяем уже назначенные цвета
  if (colorMap.has(lowerName)) return colorMap.get(lowerName)!;
  
  // Назначаем новый цвет
  const color = DEFAULT_COLORS[colorIndex % DEFAULT_COLORS.length];
  colorIndex++;
  colorMap.set(lowerName, color);
  
  return color;
};

export const ProcessesChart: React.FC<ProcessesChartProps> = memo(({ processes, totalCount }) => {
  const [viewMode, setViewMode] = useState<'bar' | 'pie' | 'donut'>('bar');
  const [metricType, setMetricType] = useState<'cpu' | 'memory'>('cpu');
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
  }, [filteredProcesses]);

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
                <Cell key={`cell-${index}`} fill={entry.name === 'Остальные' ? '#bdc3c7' : getColorForProcess(entry.name)} />
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
                <Cell key={`cell-${index}`} fill={entry.name === 'Остальные' ? '#bdc3c7' : getColorForProcess(entry.name)} />
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
              <Cell key={`cell-${index}`} fill={entry.name === 'Остальные' ? '#bdc3c7' : getColorForProcess(entry.name)} />
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
          <div className={styles.viewToggle}>
            <button className={`${styles.smallButton} ${viewMode === 'bar' ? styles.active : ''}`} onClick={() => setViewMode('bar')} title="Столбчатая">▊</button>
            <button className={`${styles.smallButton} ${viewMode === 'pie' ? styles.active : ''}`} onClick={() => setViewMode('pie')} title="Круговая">◯</button>
            <button className={`${styles.smallButton} ${viewMode === 'donut' ? styles.active : ''}`} onClick={() => setViewMode('donut')} title="Кольцевая">◎</button>
          </div>
        </div>
      </div>
      {renderChart()}
    </div>
  );
});