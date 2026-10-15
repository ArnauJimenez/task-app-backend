import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const taskService = {
  createTask: async (title: string, description: string | undefined, userId: string) => {
    return await prisma.task.create({
      data: { title, description, userId },
      include: { user: { select: { email: true } } }
    });
  },

  updateTask: async (id: string, data: { title?: string; description?: string; completed?: boolean }) => {
    return await prisma.task.update({
      where: { id },
      data,
    });
  },

  getUserTasks: async (userId?: string) => {
    const where = userId ? { userId } : {};
    return await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } }
    });
  },

  getTaskById: async (id: string, userId: string) => {
    return await prisma.task.findFirst({
      where: { id, userId },
    });
  },

  getTaskByIdOnly: async (id: string) => {
    return await prisma.task.findUnique({
      where: { id },
    });
  },

  deleteTask: async (id: string) => {
    return await prisma.task.delete({
      where: { id },
    });
  },
};