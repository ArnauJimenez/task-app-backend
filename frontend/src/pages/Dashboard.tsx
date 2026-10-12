import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Panel de Tareas (Dashboard)</h1>
      <p>Hola, <strong>{user?.name || user?.email}</strong> 👋</p>
      <button 
        onClick={logout}
        style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Cerrar Sesión
      </button>
    </div>
  );
};