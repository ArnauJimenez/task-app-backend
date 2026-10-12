import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleFakeLogin = () => {
    // Simularemos un login exitoso por ahora para probar las rutas
    login({
      token: 'fake-jwt-token-123',
      user: { id: '1', email: 'usuario@example.com', name: 'Arnau' }
    });
    navigate('/dashboard');
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2>Iniciar Sesión</h2>
      <p>Bienvenido a tu gestor de tareas.</p>
      <button 
        onClick={handleFakeLogin}
        style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        Entrar de prueba
      </button>
    </div>
  );
};