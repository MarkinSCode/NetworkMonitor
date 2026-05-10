import React, { useState, useEffect } from 'react';
import styles from './Roles.module.css';
import { config } from '../../config';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

interface Role {
  id: number;
  name: string;
  description: string | null;
  user_count: number;
}

interface User {
  id: number;
  full_name: string;
  phone: string;
  department: string | null;
}

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleUsers, setRoleUsers] = useState<User[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    Promise.all([fetchRoles(), fetchUsers()]).finally(() => setIsLoading(false));
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/roles/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setRoles(await res.json());
    } catch (err) {
      console.error('Ошибка загрузки ролей:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/users/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    }
  };

  const selectRole = async (role: Role) => {
    setSelectedRole(role);
    const res = await fetch(`${config.apiUrl}/roles/${role.id}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setRoleUsers(await res.json());
  };

  const createRole = async () => {
    if (!newRoleName) return;
    await fetch(`${config.apiUrl}/roles/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newRoleName, description: newRoleDesc }),
    });
    setNewRoleName('');
    setNewRoleDesc('');
    fetchRoles();
  };

  const deleteRole = async (roleId: number) => {
    if (!window.confirm('Удалить роль?')) return;
    await fetch(`${config.apiUrl}/roles/${roleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setSelectedRole(null);
    fetchRoles();
  };

  const addUserToRole = async (userId: number) => {
    await fetch(`${config.apiUrl}/roles/${selectedRole?.id}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId }),
    });
    selectRole(selectedRole!);
    fetchRoles();
  };

  const removeUserFromRole = async (userId: number) => {
    await fetch(`${config.apiUrl}/roles/${selectedRole?.id}/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    selectRole(selectedRole!);
    fetchRoles();
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className={styles.container}>
      <h1>Управление ролями</h1>

      <div className={styles.layout}>
        <div className={styles.left}>
          <h3>Роли ({roles.length})</h3>
          
          <div className={styles.createForm}>
            <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Название роли" />
            <input value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} placeholder="Описание" />
            <button onClick={createRole}>Создать</button>
          </div>

          <div className={styles.roleList}>
            {roles.map(role => (
              <div
                key={role.id}
                className={`${styles.roleItem} ${selectedRole?.id === role.id ? styles.selected : ''}`}
                onClick={() => selectRole(role)}
              >
                <div>
                  <strong>{role.name}</strong>
                  <span className={styles.count}>{role.user_count} чел.</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteRole(role.id); }} className={styles.delBtn}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.right}>
          {selectedRole ? (
            <>
              <h3>{selectedRole.name} — пользователи</h3>
              {selectedRole.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', marginBottom: 15 }}>
                  Описание: {selectedRole.description}
                </p>
              )}
              <div className={styles.userList}>
                {roleUsers.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>Нет пользователей</p>}
                {roleUsers.map(u => (
                  <div key={u.id} className={styles.userItem}>
                    <span>{u.full_name} ({u.phone})</span>
                    <button onClick={() => removeUserFromRole(u.id)}>Удалить</button>
                  </div>
                ))}
              </div>

              <h4>Добавить пользователя</h4>
              <div className={styles.addList}>
                {users.filter(u => !roleUsers.find(ru => ru.id === u.id)).length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>Все пользователи уже в роли</p>
                )}
                {users.filter(u => !roleUsers.find(ru => ru.id === u.id)).map(u => (
                  <div key={u.id} className={styles.userItem}>
                    <span>{u.full_name} ({u.phone})</span>
                    <button onClick={() => addUserToRole(u.id)}>Добавить</button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className={styles.hint}>Выберите роль слева</p>
          )}
        </div>
      </div>
    </div>
  );
};