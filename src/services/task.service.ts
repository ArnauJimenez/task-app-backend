import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const taskService = {
  // ➕ Crear una nueva tarea asociada a un usuario
  createTask: async (title: string, userId: string) => {
    return await prisma.task.create({
      data: {
        title,
        userId,
      },
    });
  },

  // 📋 Obtener todas las tareas que pertenecen a un usuario específico
  getUserTasks: async (userId: string) => {
    return await prisma.task.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc", // Las más recientes primero
      },
    });
  },

  // 🔍 Buscar una tarea asegurando que pertenezca al usuario
  getTaskById: async (id: string, userId: string) => {
    return await prisma.task.findFirst({
      where: {
        id,
        userId,
      },
    });
  },

  // 🕵️ Buscar una tarea únicamente por su ID (para comprobar autorías)
  getTaskByIdOnly: async (id: string) => {
    return await prisma.task.findUnique({
      where: { id },
    });
  },

  // 🔄 Actualizar parcialmente una tarea (PATCH)
  updateTask: async (id: string, data: { title?: string; completed?: boolean }) => {
    return await prisma.task.update({
      where: { id },
      data: {
        // Si el campo es undefined, Prisma ignora la actualización de esa columna
        title: data.title !== undefined ? data.title : undefined,
        completed: data.completed !== undefined ? data.completed : undefined,
      },
    });
  },

  // 🗑️ Eliminar una tarea de la base de datos
  deleteTask: async (id: string) => {
    return await prisma.task.delete({
      where: { id },
    });
  },
};