import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:4000/api', // 👈 Apuntando a tu backend en el puerto 4000
  headers: {
    'Content-Type': 'application/json',
  },
});

// Opcional: Interceptor para enviar el token JWT si ya lo tienes implementado
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});