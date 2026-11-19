import { prisma } from "../lib/prisma";

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

  updateUserTask: async (
    id: string,
    userId: string,
    data: { title?: string; description?: string; completed?: boolean },
  ) => {
    const result = await prisma.task.updateMany({
      where: { id, userId },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return prisma.task.findFirst({ where: { id, userId } });
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

  getUserById: async (id: string) => {
    return await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
  },

  deleteTask: async (id: string) => {
    return await prisma.task.delete({
      where: { id },
    });
  },

  deleteUserTask: async (id: string, userId: string) => {
    const result = await prisma.task.deleteMany({ where: { id, userId } });
    return result.count > 0;
  },

  disconnect: async () => prisma.$disconnect(),
};