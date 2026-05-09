import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from 'reactflow';

export const AreaNode: React.FC<{ id: string; data: any; selected: boolean }> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const { points, color, label, width: dataWidth, height: dataHeight } = data;
  
  const pts = points || [
    { x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 150 }, { x: 0, y: 150 },
  ];

  const minX = Math.min(...pts.map((p: any) => p.x));
  const minY = Math.min(...pts.map((p: any) => p.y));
  const maxX = Math.max(...pts.map((p: any) => p.x));
  const maxY = Math.max(...pts.map((p: any) => p.y));
  const width = dataWidth || (maxX - minX) || 200;
  const height = dataHeight || (maxY - minY) || 150;

  const onResize = useCallback((_: any, params: { width: number; height: number }) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, width: Math.round(params.width), height: Math.round(params.height) } };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  const onResizeEnd = useCallback((_: any, params: { width: number; height: number }) => {
    const scaleX = params.width / (maxX - minX || 1);
    const scaleY = params.height / (maxY - minY || 1);
    const newPoints = pts.map((p: any) => ({
      x: (p.x - minX) * scaleX,
      y: (p.y - minY) * scaleY,
    }));
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, points: newPoints, width: Math.round(params.width), height: Math.round(params.height) } };
        }
        return node;
      })
    );
  }, [id, maxX, minX, maxY, minY, pts, setNodes]);

  const scaleX = width / (maxX - minX || 1);
  const scaleY = height / (maxY - minY || 1);
  const scaledPoints = pts.map((p: any) => ({ x: (p.x - minX) * scaleX, y: (p.y - minY) * scaleY }));
  const svgPoints = scaledPoints.map((p: any) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        pointerEvents: selected ? 'auto' : 'none',
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={100}
        minHeight={80}
        keepAspectRatio={false}
        onResize={onResize}
        onResizeEnd={onResizeEnd}
      />
      
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      
      <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <polygon
          points={svgPoints}
          fill={color || 'rgba(52, 152, 219, 0.2)'}
          stroke={selected ? '#3498db' : (color || 'rgba(52, 152, 219, 0.5)')}
          strokeWidth={selected ? 2 : 1}
          strokeDasharray={selected ? 'none' : '5,5'}
        />
      </svg>

      <div style={{
        position: 'absolute', top: 8, left: 8,
        color: selected ? '#2c3e50' : '#34495e',
        fontSize: 13, fontWeight: 600,
        background: 'rgba(255,255,255,0.8)',
        padding: '2px 8px', borderRadius: 4,
        pointerEvents: 'none',
      }}>
        {label || 'Область'}
      </div>

      {selected && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          background: 'rgba(0,0,0,0.7)', color: 'white',
          fontSize: 10, padding: '2px 6px', borderRadius: 3,
          pointerEvents: 'none',
        }}>
          {width}×{height}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};

export default memo(AreaNode);