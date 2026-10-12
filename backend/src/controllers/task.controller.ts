import { Request, Response } from "express";
import { taskService } from "../services/task.service";

// ➕ CREAR TAREA
export const createTask = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const decodedUser = (req as any).user;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const newTask = await taskService.createTask(title, decodedUser.userId);
    return res.status(201).json(newTask);
  } catch (error) {
    console.error("❌ Error en createTask:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// 📋 OBTENER TODAS LAS TAREAS DEL USUARIO
export const getMyTasks = async (req: Request, res: Response) => {
  try {
    const decodedUser = (req as any).user;
    const tasks = await taskService.getUserTasks(decodedUser.userId);
    return res.json(tasks);
  } catch (error) {
    console.error("❌ Error en getMyTasks:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// 🔍 OBTENER UNA TAREA ESPECÍFICA POR ID
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const decodedUser = (req as any).user;

    if (!decodedUser || !decodedUser.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const task = await taskService.getTaskById(id, decodedUser.userId);

    if (!task) {
      return res.status(404).json({ message: "Task not found or unauthorized" });
    }

    return res.json(task);
  } catch (error) {
    console.error("❌ Error en getTaskById:", error);
    return res.status(500).json({ message: "Error fetching task" });
  }
};

// 🗑️ ELIMINAR TAREA
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const decodedUser = (req as any).user;

    if (!decodedUser || !decodedUser.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const task = await taskService.getTaskByIdOnly(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Doble verificación: ¿La tarea que intentan borrar pertenece al usuario autenticado?
    if (task.userId !== decodedUser.userId) {
      return res.status(403).json({ message: "Forbidden: You cannot delete this task" });
    }

    await taskService.deleteTask(id);
    return res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("❌ Error en deleteTask:", error);
    return res.status(500).json({ message: "Error deleting task" });
  }
};

// 🔄 ACTUALIZAR TAREA (PATCH)
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;
    const decodedUser = (req as any).user;

    if (!decodedUser || !decodedUser.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const task = await taskService.getTaskByIdOnly(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Doble verificación: ¿La tarea que intentan modificar pertenece al usuario autenticado?
    if (task.userId !== decodedUser.userId) {
      return res.status(403).json({ message: "Forbidden: You cannot update this task" });
    }

    const updatedTask = await taskService.updateTask(id, { title, completed });
    return res.json(updatedTask);
  } catch (error) {
    console.error("❌ Error en updateTask:", error);
    return res.status(500).json({ message: "Error updating task" });
  }
};