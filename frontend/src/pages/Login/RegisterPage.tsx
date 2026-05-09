import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import styles from './Auth.module.css';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    phone: '',
    full_name: '',
    department: '',
    password: '',
    password_confirm: '',
    agree_to_data_processing: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(formData.phone)) {
        setError('Введите 10 цифр номера телефона');
        return;
      }
      if (!formData.agree_to_data_processing) {
        setError('Необходимо согласие на обработку данных');
        return;
      }
      if (formData.password !== formData.password_confirm) {
        setError('Пароли не совпадают');
        return;
      }
    
    setIsLoading(true);
    
    try {
      const response = await authService.register(formData);
      setSuccess(response.message);
      

      setTimeout(() => {
        navigate('/login');
      }, 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Регистрация</h1>
        
        {error && <div className={styles.error}>
          {typeof error === 'object' ? JSON.stringify(error) : error}
        </div>}
        {success && <div className={styles.success}>{success}</div>}
        
        {!success ? (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Номер телефона (без +7)</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="1234567890"
                required
                maxLength={10}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>ФИО *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Иванов Иван Иванович"
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Подразделение</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Отдел IT"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Пароль *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Минимум 6 символов"
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Подтверждение пароля *</label>
              <input
                type="password"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                placeholder="Повторите пароль"
                required
              />
            </div>
            
            <div className={styles.checkbox}>
              <input
                type="checkbox"
                name="agree_to_data_processing"
                checked={formData.agree_to_data_processing}
                onChange={handleChange}
                id="agree"
              />
              <label htmlFor="agree">
                Я согласен на обработку персональных данных
              </label>
            </div>
            
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>
        ) : (
          <p>Через 5 секунд вы будете перенаправлены на страницу входа...</p>
        )}
        
        <p className={styles.link}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};