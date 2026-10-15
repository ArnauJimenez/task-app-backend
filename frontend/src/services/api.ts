import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:4000/api", // Ajusta el puerto si tu backend corre en otro
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para inyectar automáticamente el token JWT en cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);