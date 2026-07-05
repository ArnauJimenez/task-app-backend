import { prisma } from "../prisma/client";

export const taskService = {
  createTask: async (title: string, userId: string) => {
    return await prisma.task.create({
      data: { title, userId },
    });
  },

  getUserTasks: async (userId: string) => {
    return await prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  // 🔌 AÑADE ESTA FUNCIÓN AQUÍ ABAJO:
  getTaskById: async (id: string, userId: string) => {
    return await prisma.task.findFirst({
      where: {
        id: id,       // Que coincida el ID de la tarea
        userId: userId // 🔐 Que pertenezca al usuario del token
      },
    });
  },
};