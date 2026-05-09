import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Node } from 'reactflow';
import { Client } from '../../types';
import styles from './Schema.module.css';
import { config } from '../../config';

interface Role {
  id: number;
  name: string;
}

interface Props {
  node: Node;
  clients: Client[];
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  isAdmin: boolean;
}

export const PropertiesPanel: React.FC<Props> = ({ node, clients, onUpdate, onDelete }) => {
  const [label, setLabel] = useState(node.data.label || '');
  const [owner, setOwner] = useState(node.data.owner || '');
  const [notes, setNotes] = useState(node.data.notes || '');
  const [editNodeId, setEditNodeId] = useState(node.id);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    if (node.type === 'area') {
      fetch(`${config.apiUrl}/roles/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setRoles(data || []))
        .catch(console.error);
    }
    setLabel(node.data.label || '');
    setOwner(node.data.owner || '');
    setNotes(node.data.notes || '');
    setEditNodeId(node.id);
  }, [node.type, node.id]);

  const handleSave = () => {
    onUpdate(editNodeId, { label, owner, notes });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      onUpdate(node.id, { imageUrl });
    };
    reader.readAsDataURL(file);
  };

  const toggleRole = (roleName: string, type: 'viewRoles' | 'manageRoles') => {
    const current = node.data[type] || [];
    const updated = current.includes(roleName)
      ? current.filter((r: string) => r !== roleName)
      : [...current, roleName];
    onUpdate(node.id, { [type]: updated });
  };

  const handleReport = async () => {
    if (!reportText.trim()) return;
    
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${config.apiUrl}/monitoring/problem-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: node.data.clientId || null,
          node_id: node.id,
          node_label: node.data.label,
          description: reportText,
        })
      });
      setShowReport(false);
      setReportText('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Ошибка отправки отчёта:', err);
    }
  };

  return (
    <div className={styles.properties}>
      <h3>Свойства</h3>
      
      <div className={styles.propGroup}>
        <label>Название</label>
        <input value={label} onChange={e => setLabel(e.target.value)} onBlur={handleSave} />
      </div>

      {node.type === 'computer' && (
        <>
          <div className={styles.propGroup}>
            <label>Привязать к ПК</label>
            <select
              value={node.data.clientId || ''}
              onChange={e => {
                const value = e.target.value ? Number(e.target.value) : null;
                onUpdate(node.id, { clientId: value });
              }}
            >
              <option value="">Не привязан</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.display_name || c.hostname}</option>
              ))}
            </select>
          </div>
          <div className={styles.propGroup}>
            <label>Владелец</label>
            <input value={owner} onChange={e => setOwner(e.target.value)} onBlur={handleSave} />
          </div>
          <div className={styles.propGroup}>
            <label>Примечание</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleSave} rows={3} />
          </div>
          <button className={styles.reportBtn} onClick={() => setShowReport(true)}>Отчёт о проблеме</button>

          {showReport && ReactDOM.createPortal(
            <div style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.5)', display: 'flex',
              justifyContent: 'center', alignItems: 'center', zIndex: 9999,
            }} onClick={() => setShowReport(false)}>
              <div style={{
                background: 'var(--bg-card)', padding: 25, borderRadius: 12,
                width: 400, maxWidth: '90%',
              }} onClick={e => e.stopPropagation()}>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: 10 }}>Отчёт о проблеме</h4>
                <p style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>Объект: {node.data.label}</p>
                <textarea
                  value={reportText}
                  onChange={e => setReportText(e.target.value)}
                  placeholder="Опишите проблему..."
                  rows={4}
                  style={{ width: '100%', marginTop: 10, marginBottom: 10,
                    background: 'var(--bg-input)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-input)', borderRadius: 4, padding: 8 }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleReport} className={styles.reportBtn}>Отправить</button>
                  <button onClick={() => setShowReport(false)} className={styles.deleteBtn}>Отмена</button>
                </div>
              </div>
            </div>,
            document.body
          )}
          {showSuccess && ReactDOM.createPortal(
            <div style={{
              position: 'fixed',
              bottom: 30,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--success)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: '0.95em',
              fontWeight: 500,
              zIndex: 10000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              animation: 'fadeInUp 0.3s ease',
            }}>
              Отчёт успешно отправлен
            </div>,
            document.body
          )}
        </>
      )}

      {node.type === 'image' && (
        <>
            <div className={styles.propGroup}>
            <label>Изображение</label>
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                style={{ display: 'none' }}
            />
            <button onClick={() => fileInputRef.current?.click()} className={styles.uploadBtn}>
                📁 Выбрать файл
            </button>
            {node.data.imageUrl && (
                <img src={node.data.imageUrl} alt="" style={{ width: '100%', marginTop: 8, borderRadius: 4 }} />
            )}
            </div>
            
            <div className={styles.propGroup}>
            <label>Ширина (px)</label>
            <input
                type="number"
                value={node.data.width || 100}
                onChange={e => onUpdate(node.id, { width: Number(e.target.value) })}
            />
            </div>
            <div className={styles.propGroup}>
            <label>Высота (px)</label>
            <input
                type="number"
                value={node.data.height || 100}
                onChange={e => onUpdate(node.id, { height: Number(e.target.value) })}
            />
            </div>
            
            <div className={styles.propGroup}>
            <label>Режим масштабирования</label>
            <select
                value={node.data.keepAspectRatio !== false ? 'aspect' : 'free'}
                onChange={e => onUpdate(node.id, { keepAspectRatio: e.target.value === 'aspect' })}
            >
                <option value="aspect">Сохранять пропорции</option>
                <option value="free">Свободное</option>
            </select>
            </div>
        </>
        )}

        {node.type === 'area' && (
          <>
            <div className={styles.propGroup}>
              <label>Ширина (px)</label>
              <input type="number" value={Math.round(node.data.width || 200)} onChange={e => onUpdate(node.id, { width: Number(e.target.value) })} />
            </div>
            <div className={styles.propGroup}>
              <label>Высота (px)</label>
              <input type="number" value={Math.round(node.data.height || 150)} onChange={e => onUpdate(node.id, { height: Number(e.target.value) })} />
            </div>
            
            <div className={styles.propGroup}>
              <label>Цвет заливки</label>
              <input type="color" value={(node.data.color || '#3498db33').slice(0, 7)} onChange={e => onUpdate(node.id, { color: e.target.value + '33' })} />
            </div>

            <div className={styles.propGroup}>
              <label>Объектов внутри: {(node.data.memberIds || []).length}</label>
            </div>

            <div className={styles.propGroup}>
              <label>Роли для просмотра</label>
              <div className={styles.roleCheckboxes}>
                {roles.map(role => (
                  <label key={role.id} className={styles.roleCheckbox}>
                    <input
                      type="checkbox"
                      checked={(node.data.viewRoles || []).includes(role.name)}
                      onChange={() => toggleRole(role.name, 'viewRoles')}
                    />
                    {role.name}
                  </label>
                ))}
                {roles.length === 0 && <span className={styles.noRoles}>Нет созданных ролей</span>}
              </div>
            </div>
          </>
        )}

      <button onClick={() => onDelete(node.id)} className={styles.deleteBtn}>Удалить</button>
    </div>
  );
};