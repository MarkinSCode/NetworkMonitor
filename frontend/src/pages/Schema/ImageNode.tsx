import React, { memo, useCallback, useState } from 'react';
import { NodeResizer, useReactFlow } from 'reactflow';

export const ImageNode: React.FC<{ id: string; data: any; selected: boolean }> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const [currentSize, setCurrentSize] = useState({ width: data.width || 100, height: data.height || 100 });
  const keepAspectRatio = data.keepAspectRatio !== false;

  const onResize = useCallback((_: any, params: { width: number; height: number }) => {
    setCurrentSize({ width: Math.round(params.width), height: Math.round(params.height) });
  }, []);

  const onResizeEnd = useCallback((_: any, params: { width: number; height: number }) => {
    const w = Math.round(params.width);
    const h = Math.round(params.height);
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, width: w, height: h } };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={50}
        minHeight={50}
        onResize={onResize}
        onResizeEnd={onResizeEnd}
        handleStyle={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#3498db', border: '2px solid white' }}
        lineStyle={{ borderColor: '#3498db' }}
      />
      
      <div
        style={{
          width: currentSize.width,
          height: currentSize.height,
          borderRadius: 4,
          overflow: 'hidden',
          border: selected ? '2px solid var(--accent)' : '2px solid transparent',
        }}
      >
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt={data.label}
            style={{ width: '100%', height: '100%', objectFit: keepAspectRatio ? 'contain' : 'fill', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: 24,
          }}>
            🖼
          </div>
        )}
        
        {selected && (
          <div style={{
            position: 'absolute', bottom: 4, right: 4,
            background: 'rgba(0,0,0,0.7)', color: 'white',
            fontSize: 10, padding: '2px 6px', borderRadius: 3,
          }}>
            {currentSize.width}×{currentSize.height}
          </div>
        )}
      </div>
    </>
  );
};

export default memo(ImageNode);