// Define la estructura de un Usuario
export interface User {
  id: string;
  email: string;
  name?: string;
}

// Define los estados de una Tarea
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

// Define la estructura de una Tarea
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

// Estructura de la respuesta del backend al hacer Login / Registro
export interface AuthResponse {
  token: string;
  user: User;
}

// Payload para crear/editar tareas
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
}