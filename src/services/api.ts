const API_URL = 'http://localhost:3000/api';

export const api = {
  // Autenticación
  async register(name: string, email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en el registro');
    return data;
  },

  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');
    return data;
  },

  // Tareas
  async getTasks() {
    const res = await fetch(`${API_URL}/tasks`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cargar tareas');
    return data;
  },

  async createTask(title: string, description: string, userId: string) {
    const res = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear la tarea');
    return data;
  },

  async deleteTask(id: string) {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar la tarea');
    return data;
  },
};