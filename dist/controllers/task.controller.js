"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTask = exports.deleteTask = exports.getTaskById = exports.getMyTasks = exports.createTask = void 0;
const task_service_1 = require("../services/task.service");
// ➕ CREAR TAREA
const createTask = async (req, res) => {
    try {
        const { title } = req.body;
        const decodedUser = req.user;
        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }
        const newTask = await task_service_1.taskService.createTask(title, decodedUser.userId);
        return res.status(201).json(newTask);
    }
    catch (error) {
        console.error("❌ Error en createTask:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.createTask = createTask;
// 📋 OBTENER TODAS LAS TAREAS DEL USUARIO
const getMyTasks = async (req, res) => {
    try {
        const decodedUser = req.user;
        const tasks = await task_service_1.taskService.getUserTasks(decodedUser.userId);
        return res.json(tasks);
    }
    catch (error) {
        console.error("❌ Error en getMyTasks:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getMyTasks = getMyTasks;
// 🔍 OBTENER UNA TAREA ESPECÍFICA POR ID
const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedUser = req.user;
        if (!decodedUser || !decodedUser.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const task = await task_service_1.taskService.getTaskById(id, decodedUser.userId);
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
// 🗑️ ELIMINAR TAREA
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedUser = req.user;
        if (!decodedUser || !decodedUser.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const task = await task_service_1.taskService.getTaskByIdOnly(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        if (task.userId !== decodedUser.userId) {
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
// 🔄 ACTUALIZAR TAREA (PATCH) - ¡Aquí está la que faltaba!
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, completed } = req.body;
        const decodedUser = req.user;
        if (!decodedUser || !decodedUser.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const task = await task_service_1.taskService.getTaskByIdOnly(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        if (task.userId !== decodedUser.userId) {
            return res.status(403).json({ message: "Forbidden: You cannot update this task" });
        }
        const updatedTask = await task_service_1.taskService.updateTask(id, { title, completed });
        return res.json(updatedTask);
    }
    catch (error) {
        console.error("❌ Error en updateTask:", error);
        return res.status(500).json({ message: "Error updating task" });
    }
};
exports.updateTask = updateTask;
