"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTask = exports.deleteTask = exports.getTaskById = exports.getMyTasks = exports.createTask = void 0;
const task_service_1 = require("../services/task.service");
const createTask = async (req, res) => {
    try {
        const { title, description } = req.body;
        const decodedUser = req.user;
        const userId = decodedUser?.userId || decodedUser?.id;
        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
        }
        const newTask = await task_service_1.taskService.createTask(title, description, userId);
        return res.status(201).json(newTask);
    }
    catch (error) {
        console.error("❌ Error en createTask:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.createTask = createTask;
const getMyTasks = async (req, res) => {
    try {
        const decodedUser = req.user;
        const userId = decodedUser?.userId || decodedUser?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
        }
        const tasks = await task_service_1.taskService.getUserTasks(userId);
        return res.json(tasks);
    }
    catch (error) {
        console.error("❌ Error en getMyTasks:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getMyTasks = getMyTasks;
const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedUser = req.user;
        const userId = decodedUser?.userId || decodedUser?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const task = await task_service_1.taskService.getTaskById(id, userId);
        if (!task) {
            return res.status(404).json({ message: "Task not found or unauthorized" });
        }
        return res.json(task);
    }
    catch (error) {
        console.error("❌ Error en getTaskById:", error);
        return res.status(500).json({ message: "Error fetching task" });
    }
};
exports.getTaskById = getTaskById;
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedUser = req.user;
        const userId = decodedUser?.userId || decodedUser?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const task = await task_service_1.taskService.getTaskByIdOnly(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        if (task.userId !== userId) {
            return res.status(403).json({ message: "Forbidden: You cannot delete this task" });
        }
        await task_service_1.taskService.deleteTask(id);
        return res.json({ message: "Task deleted successfully" });
    }
    catch (error) {
        console.error("❌ Error en deleteTask:", error);
        return res.status(500).json({ message: "Error deleting task" });
    }
};
exports.deleteTask = deleteTask;
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, completed } = req.body;
        const decodedUser = req.user;
        const userId = decodedUser?.userId || decodedUser?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const task = await task_service_1.taskService.getTaskByIdOnly(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        if (task.userId !== userId) {
            return res.status(403).json({ message: "Forbidden: You cannot update this task" });
        }
        const updatedTask = await task_service_1.taskService.updateTask(id, { title, description, completed });
        return res.json(updatedTask);
    }
    catch (error) {
        console.error("❌ Error en updateTask:", error);
        return res.status(500).json({ message: "Error updating task" });
    }
};
exports.updateTask = updateTask;
