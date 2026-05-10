import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { useAuth } from '../../hooks/useAuth';

export const Layout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div>
      {isAuthenticated && <Header />}
      <main style={{ padding: '20px', paddingTop: '80px' }}>
        <Outlet />
      </main>
    </div>
  );
};