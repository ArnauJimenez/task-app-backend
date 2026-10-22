"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.taskService = {
    createTask: async (title, description, userId) => {
        return await prisma.task.create({
            data: { title, description, userId },
            include: { user: { select: { email: true } } }
        });
    },
    updateTask: async (id, data) => {
        return await prisma.task.update({
            where: { id },
            data,
        });
    },
    getUserTasks: async (userId) => {
        const where = userId ? { userId } : {};
        return await prisma.task.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { user: { select: { email: true } } }
        });
    },
    getTaskById: async (id, userId) => {
        return await prisma.task.findFirst({
            where: { id, userId },
        });
    },
    getTaskByIdOnly: async (id) => {
        return await prisma.task.findUnique({
            where: { id },
        });
    },
    deleteTask: async (id) => {
        return await prisma.task.delete({
            where: { id },
        });
    },
};
