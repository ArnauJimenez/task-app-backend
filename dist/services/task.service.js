"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = void 0;
const client_1 = require("../prisma/client");
exports.taskService = {
    createTask: async (title, userId) => {
        return await client_1.prisma.task.create({
            data: {
                title,
                userId,
            },
        });
    },
    getUserTasks: async (userId) => {
        return await client_1.prisma.task.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    },
    getTaskById: async (id, userId) => {
        return await client_1.prisma.task.findFirst({
            where: {
                id: id,
                userId: userId, // Filtro de seguridad activo
            },
        });
    },
    getTaskByIdOnly: async (id) => {
        return await client_1.prisma.task.findUnique({
            where: { id },
        });
    },
    deleteTask: async (id) => {
        return await client_1.prisma.task.delete({
            where: { id },
        });
    },
    // 🔄 NUEVO MÉTODO DE ACTUALIZACIÓN CON PRISMA
    updateTask: async (id, data) => {
        return await client_1.prisma.task.update({
            where: { id },
            data, // Prisma es inteligente: si solo le pasas 'completed', solo cambiará eso sin romper el título
        });
    },
};
