import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Layout } from './components/Layout/Layout';
import { LoginPage } from './pages/Login/LoginPage';
import { RegisterPage } from './pages/Login/RegisterPage';
import { MonitoringPage } from './pages/Monitoring/MonitoringPage';
import { AuditPage } from './pages/Audit/AuditPage';
import { SchemaPage } from './pages/Schema/SchemaPage';
import { RolesPage } from './pages/Roles/RolesPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { UsersPage } from './pages/Users/UsersPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { ThemeProvider } from './context/ThemeContext';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="monitoring" element={
                  <ProtectedRoute>
                    <MonitoringPage />
                  </ProtectedRoute>
                }
              />
              <Route path="scheme" element={<ProtectedRoute><SchemaPage /></ProtectedRoute>} />
              <Route path="roles" element={<ProtectedRoute requireAdmin><RolesPage /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute requireAdmin><ReportsPage /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute requireAdmin><UsersPage /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute requireAdmin><SettingsPage /></ProtectedRoute>} />
              
              <Route
                path="audit"
                element={
                  <ProtectedRoute requireAdmin>
                    <AuditPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/monitoring" replace />} />
              <Route path="*" element={<div>Страница не найдена</div>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;