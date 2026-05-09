import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node, Background, MiniMap, NodeTypes,
  useNodesState, ReactFlowProvider, useReactFlow,
  NodeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import { monitoringService } from '../../services/monitoring.service';
import { Client } from '../../types';
import { config } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { ComputerNode } from './ComputerNode';
import { ImageNode } from './ImageNode';
import { AreaNode } from './AreaNode';
import { PropertiesPanel } from './PropertiesPanel';
import styles from './Schema.module.css';

const nodeTypes: NodeTypes = {
  computer: ComputerNode,
  image: ImageNode,
  area: AreaNode,
};

const FlowContent: React.FC<{
  clients: Client[];
  selectedNode: Node | null;
  setSelectedNode: (node: Node | null) => void;
  isAdmin: boolean;
}> = ({ clients, selectedNode, setSelectedNode, isAdmin }) => {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState([]);
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    const loadSchema = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${config.apiUrl}/schema/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.nodes && data.nodes.length > 0) {
            const nodesWithZIndex = data.nodes.map((n: Node) => ({
              ...n,
              zIndex: n.type === 'area' ? 10 : n.type === 'image' ? 5 : 20,
            }));
            setNodes(nodesWithZIndex);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки схемы:', err);
      }
    };
    loadSchema();
  }, []);

  const saveSchema = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      setNodes(currentNodes => {
        const nodesToSave = currentNodes.map(n => ({
          ...n,
          zIndex: n.type === 'area' ? 10 : n.type === 'image' ? 5 : 20,
        }));
        
        fetch(`${config.apiUrl}/schema/`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ nodes: nodesToSave })
        }).then(() => alert('Схема сохранена в БД'))
          .catch(err => console.error('Ошибка сохранения:', err));
        
        return currentNodes;
      });
    } catch (err) {
      console.error('Ошибка сохранения:', err);
    }
  }, []);

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
    if (selectedNodes.length === 0) setSelectedNode(null);
    else if (selectedNodes.length === 1) setSelectedNode(selectedNodes[0]);
    else setSelectedNode(null);
  }, [setSelectedNode]);

  useEffect(() => {
    if (!isAdmin) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        setNodes((nds: Node[]) => {
          const selectedIds = nds.filter(n => n.selected).map(n => n.id);
          if (selectedIds.length > 0) {
            setSelectedNode(null);
            return nds.filter(n => !selectedIds.includes(n.id));
          }
          return nds;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setNodes, setSelectedNode, isAdmin]);

  const updateAreaMembers = useCallback((nds: Node[]) => {
      return nds.map(node => {
        if (node.type !== 'area') return node;
        const areaPoints = node.data.points || [];
        if (areaPoints.length === 0) return node;
        const minX = Math.min(...areaPoints.map((p: any) => p.x));
        const minY = Math.min(...areaPoints.map((p: any) => p.y));
        const maxX = Math.max(...areaPoints.map((p: any) => p.x));
        const maxY = Math.max(...areaPoints.map((p: any) => p.y));
        
        const membersInArea = nds
          .filter(n => n.type === 'computer' && n.id !== node.id)
          .filter(n => {
            const cx = n.position.x + 50;
            const cy = n.position.y + 25;
            return cx >= node.position.x + minX && cx <= node.position.x + maxX &&
                  cy >= node.position.y + minY && cy <= node.position.y + maxY;
          });
        
        const memberIds = membersInArea.map(n => n.id);
        const memberClientIds = membersInArea
          .filter(n => n.data.clientId)
          .map(n => n.data.clientId);
        return { ...node, data: { ...node.data, memberIds, memberClientIds } };
      });
    }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (!isAdmin) return;
    onNodesChangeBase(changes);
    const hasPositionChange = changes.some(
      change => change.type === 'position' && change.dragging === false
    );
    if (hasPositionChange) {
      setNodes(nds => updateAreaMembers(nds));
    }
  }, [onNodesChangeBase, updateAreaMembers, setNodes, isAdmin]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const updateNodeData = (nodeId: string, newData: any) => {
    if (!isAdmin) return;
    setNodes((nds: Node[]) => nds.map((node: Node) => {
      if (node.id === nodeId) {
        const updated = { ...node, data: { ...node.data, ...newData } };
        setSelectedNode(updated);
        return updated;
      }
      return node;
    }));
  };

  const deleteNode = (nodeId: string) => {
    if (!isAdmin) return;
    setNodes((nds: Node[]) => nds.filter((n: Node) => n.id !== nodeId));
    setSelectedNode(null);
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (!isAdmin) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [isAdmin]);

  const onDrop = useCallback((event: React.DragEvent) => {
    if (!isAdmin) return;
    event.preventDefault();
    const type = event.dataTransfer.getData('nodeType') as 'computer' | 'image' | 'area';
    if (!type) return;
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      zIndex: type === 'area' ? 10 : type === 'image' ? 5 : 20,
      data: {
        label: type === 'computer' ? 'Новый ПК' : type === 'image' ? 'Изображение' : 'Область',
        ...(type === 'image' ? { width: 100, height: 100, keepAspectRatio: true } : {}),
        ...(type === 'area' ? {
          points: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 150 }, { x: 0, y: 150 }],
          color: 'rgba(52, 152, 219, 0.2)',
          memberIds: [],
          viewRoles: [],
        } : {}),
      },
    };
    setNodes(nds => [...nds, newNode]);
  }, [reactFlowInstance, setNodes, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const handler = () => saveSchema();
    window.addEventListener('save-schema', handler);
    return () => window.removeEventListener('save-schema', handler);
  }, [saveSchema, isAdmin]);

  return (
    <div className={styles.workspace}>
      <div className={styles.sidebar}>
        {isAdmin && (
          <>
            <h3>Библиотека объектов</h3>
            <div className={styles.modes2}>
              <button className={styles.modeBtn2}
                draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'computer')}>
                🖥 ПК
              </button>
              <button className={styles.modeBtn2}
                draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'image')}>
                🖼 Картинка
              </button>
              <button className={styles.modeBtn2}
                draggable onDragStart={(e) => e.dataTransfer.setData('nodeType', 'area')}>
                ⬡ Область
              </button>
            </div>
            <div className={styles.divider} />
          </>
        )}
        <h3>Объекты проекта ({nodes.length})</h3>
        <div className={styles.nodeList}>
          {nodes.map(node => (
            <div key={node.id}
              className={`${styles.nodeItem} ${selectedNode?.id === node.id ? styles.selected : ''}`}
              onClick={() => setSelectedNode(node)}>
              <span>{node.type === 'computer' ? '🖥' : node.type === 'image' ? '🖼' : '⬡'}</span>
              <span>{node.data.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.canvas} ${selectedNode ? styles.withProperties : ''}`}
        onDragOver={onDragOver} onDrop={onDrop} style={{ userSelect: 'none' }}>
        <ReactFlow
          nodes={nodes}
          onNodesChange={isAdmin ? onNodesChange : undefined}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          panOnDrag={isAdmin ? [1] : [0, 1]}
          selectionOnDrag={isAdmin}
          selectNodesOnDrag={isAdmin}
          onNodeDragStart={isAdmin ? onNodeDragStart : undefined}
          onSelectionChange={isAdmin ? onSelectionChange : undefined}
          elevateNodesOnSelect={false}
          nodesDraggable={isAdmin}
          elementsSelectable={true}
        >
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>

      {selectedNode && (
        (isAdmin || selectedNode.type !== 'area') && (
          <PropertiesPanel
            node={selectedNode}
            clients={clients}
            onUpdate={updateNodeData}
            onDelete={deleteNode}
            isAdmin={isAdmin}
          />
        )
      )}
    </div>
  );
};

export const SchemaPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.is_admin || false;
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await monitoringService.getClients();
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div>Загрузка...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2>Схема сети</h2>
        {isAdmin && (
          <button onClick={() => window.dispatchEvent(new CustomEvent('save-schema'))} className={styles.btn}>
            Сохранить
          </button>
        )}
      </div>

      <ReactFlowProvider>
        <FlowContent
          clients={clients}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          isAdmin={isAdmin}
        />
      </ReactFlowProvider>
    </div>
  );
};