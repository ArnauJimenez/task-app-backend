"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = void 0;
const client_1 = require("../prisma/client");
exports.taskService = {
    createTask: async (title, userId) => {
        return await client_1.prisma.task.create({
            data: { title, userId },
        });
    },
    getUserTasks: async (userId) => {
        return await client_1.prisma.task.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    },
    // 🔌 AÑADE ESTA FUNCIÓN AQUÍ ABAJO:
    getTaskById: async (id, userId) => {
        return await client_1.prisma.task.findFirst({
            where: {
                id: id, // Que coincida el ID de la tarea
                userId: userId // 🔐 Que pertenezca al usuario del token
            },
        });
    },
};
