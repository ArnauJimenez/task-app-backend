import axios from "axios";

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiServerUrl = configuredApiUrl ? stripTrailingSlashes(configuredApiUrl) : "";
const apiPathBase = apiServerUrl.endsWith("/api") ? apiServerUrl : `${apiServerUrl}/api`;

export const apiBaseUrl = apiPathBase || "/api";
export const socketUrl = import.meta.env.VITE_SOCKET_URL?.trim()
  || (apiServerUrl ? apiServerUrl.replace(/\/api$/, "") : window.location.origin);

export const api = axios.create({
  baseURL: apiBaseUrl,
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