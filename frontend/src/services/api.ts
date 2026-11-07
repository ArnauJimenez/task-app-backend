import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL;
console.log("VITE_API_URL actual:", rawApiUrl); // Esto saldrá en la consola del navegador (F12)

export const apiOrigin = rawApiUrl ? new URL(rawApiUrl).origin : "http://localhost:4000";

export const api = axios.create({
  baseURL: rawApiUrl ? `${rawApiUrl}/api` : "http://localhost:4000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

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