import React, { memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import styles from './Monitoring.module.css';

interface CpuCoresChartProps {
  cores: number[];
}

export const CpuCoresChart: React.FC<{ cores: number[] }> = memo(({ cores }) => {
  const data = cores.map((usage, index) => ({
    core: `Ядро ${index + 1}`,
    usage: usage,
    index: index,
  }));

  const getColor = (value: number) => {
    if (value > 90) return '#e74c3c';
    if (value > 70) return '#f39c12';
    if (value > 50) return '#f1c40f';
    return '#2ecc71';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <p className={styles.tooltipValue} style={{ color: getColor(value) }}>
            {value}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.chartContainer}>
      <h3>Загрузка CPU по ядрам</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
          <XAxis 
            dataKey="core" 
            stroke="#7f8c8d" 
            fontSize={12} 
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            stroke="#7f8c8d" 
            fontSize={12} 
            domain={[0, 100]}
            label={{ value: '%', position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="usage" name="Загрузка %" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.usage)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});