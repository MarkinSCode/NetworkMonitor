import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Header.module.css';
import { useTheme } from '../../context/ThemeContext';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <header className={styles.header}>
      <div className={styles.logo}><Link to="/">🖥️ NH Monitoring</Link></div>
      <nav className={styles.nav}>
        <Link to="/monitoring">Мониторинг</Link>
        <Link to="/scheme">Схема сети</Link>
        {user?.is_admin && (<Link to="/audit">Аудит</Link>)}
        {user?.is_admin && <Link to="/roles">Роли</Link>}
        {user?.is_admin && <Link to="/reports">Отчёты</Link>}
        {user?.is_admin && <Link to="/users">Пользователи</Link>}
        {user?.is_admin && <Link to="/settings">Настройки</Link>}
      </nav>
      <div className={styles.userInfo}>
        <button onClick={toggleTheme} className={styles.themeBtn}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <span className={styles.userName}>{user?.full_name}</span>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Выйти
        </button>
      </div>
    </header>
  );
};