import React, { useState, useEffect } from 'react';
import styles from './Users.module.css';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { config } from '../../config';
interface User {
  id: number;
  phone: string;
  full_name: string;
  department: string | null;
  is_approved: boolean;
  is_blocked: boolean;
  is_admin: boolean;
  created_at: string;
}

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const token = localStorage.getItem('access_token');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/users/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const action = async (url: string) => {
    await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    fetchUsers();
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm('Удалить пользователя?')) return;
    
    try {
      const res = await fetch(`${config.apiUrl}/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Ошибка удаления');
      }
      
      fetchUsers();
    } catch (err: any) {
      alert('Не удалось удалить пользователя');
      console.error(err);
    }
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(filter.toLowerCase()) ||
    u.phone.includes(filter)
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className={styles.container}>
      <h1>Управление пользователями</h1>

      <div className={styles.controls}>
        <input
          placeholder="Поиск по имени или телефону..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className={styles.search}
        />
        <span className={styles.count}>Всего: {users.length}</span>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>ФИО</th>
              <th>Телефон</th>
              <th>Отдел</th>
              <th>Статус</th>
              <th>Роль</th>
              <th>Дата регистрации</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={u.is_blocked ? styles.blocked : ''}>
                <td>{u.id}</td>
                <td>{u.full_name}</td>
                <td>{u.phone}</td>
                <td>{u.department || '-'}</td>
                <td>
                  <span className={`${styles.badge} ${u.is_approved ? styles.approved : styles.pending}`}>
                    {u.is_approved ? 'Подтверждён' : 'Ожидает'}
                  </span>
                  {u.is_blocked && <span className={`${styles.badge} ${styles.blockedBadge}`}>Заблокирован</span>}
                </td>
                <td>
                  <span className={`${styles.badge} ${u.is_admin ? styles.admin : styles.user}`}>
                    {u.is_admin ? 'Админ' : 'Пользователь'}
                  </span>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                <td className={styles.actions}>
                  {!u.is_approved && (
                    <button onClick={() => action(`${config.apiUrl}/users/${u.id}/approve`)} className={styles.approveBtn}>
                      Подтвердить регистрацию
                    </button>
                  )}
                  <button onClick={() => action(`${config.apiUrl}/users/${u.id}/toggle-admin`)} className={styles.adminBtn}>
                    {u.is_admin ? 'Забрать права' : 'Выдать права'}
                  </button>
                  {u.is_blocked ? (
                    <button onClick={() => action(`${config.apiUrl}/users/${u.id}/unblock`)} className={styles.unblockBtn}>
                      Разблокировать
                    </button>
                  ) : (
                    <button onClick={() => action(`${config.apiUrl}/users/${u.id}/block`)} className={styles.blockBtn}>
                      Заблокировать
                    </button>
                  )}
                  <button onClick={() => deleteUser(u.id)} className={styles.deleteBtn}>
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};