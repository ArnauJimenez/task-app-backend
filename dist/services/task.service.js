"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = void 0;
const prisma_1 = require("../lib/prisma");
exports.taskService = {
    createTask: async (title, description, userId) => {
        return await prisma_1.prisma.task.create({
            data: { title, description, userId },
            include: { user: { select: { email: true } } }
        });
    },
    updateTask: async (id, data) => {
        return await prisma_1.prisma.task.update({
            where: { id },
            data,
        });
    },
    updateUserTask: async (id, userId, data) => {
        const result = await prisma_1.prisma.task.updateMany({
            where: { id, userId },
            data,
        });
        if (result.count === 0) {
            return null;
        }
        return prisma_1.prisma.task.findFirst({ where: { id, userId } });
    },
    getUserTasks: async (userId) => {
        const where = userId ? { userId } : {};
        return await prisma_1.prisma.task.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { user: { select: { email: true } } }
        });
    },
    getTaskById: async (id, userId) => {
        return await prisma_1.prisma.task.findFirst({
            where: { id, userId },
        });
    },
    getTaskByIdOnly: async (id) => {
        return await prisma_1.prisma.task.findUnique({
            where: { id },
        });
    },
    getUserById: async (id) => {
        return await prisma_1.prisma.user.findUnique({
            where: { id },
            select: { id: true },
        });
    },
    deleteTask: async (id) => {
        return await prisma_1.prisma.task.delete({
            where: { id },
        });
    },
    deleteUserTask: async (id, userId) => {
        const result = await prisma_1.prisma.task.deleteMany({ where: { id, userId } });
        return result.count > 0;
    },
    disconnect: async () => prisma_1.prisma.$disconnect(),
};
