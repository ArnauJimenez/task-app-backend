import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const taskService = {
  // Crear una tarea (hacemos description y userId opcionales con '?')
  createTask: async (title: string, description?: string, userId?: string) => {
    return await prisma.task.create({
      data: { 
        title, 
        description, 
        userId 
      },
      include: {
        user: { select: { name: true } }
      }
    });
  },
  // Añade esta función dentro de taskService en task.service.ts
updateTask: async (id: string, data: { title?: string; description?: string; completed?: boolean }) => {
  return await prisma.task.update({
    where: { id },
    data,
  });
},

  // Obtener todas las tareas
  getUserTasks: async (userId?: string) => {
    const where = userId ? { userId } : {};
    return await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true } }
      }
    });
  },

  // Eliminar una tarea
  deleteTask: async (id: string) => {
    return await prisma.task.delete({
      where: { id },
    });
  },
};
