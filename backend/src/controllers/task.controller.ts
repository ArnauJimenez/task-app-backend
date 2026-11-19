import { Request, Response } from "express";
import { taskService } from "../services/task.service";

export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const decodedUser = (req as any).user;
    const userId = decodedUser?.userId || decodedUser?.id;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
    }

    const newTask = await taskService.createTask(title, description, userId);
    return res.status(201).json(newTask);
  } catch (error) {
    console.error("❌ Error en createTask:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyTasks = async (req: Request, res: Response) => {
  try {
    const decodedUser = (req as any).user;
    const userId = decodedUser?.userId || decodedUser?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
    }

    const tasks = await taskService.getUserTasks(userId);
    return res.json(tasks);
  } catch (error) {
    console.error("❌ Error en getMyTasks:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const decodedUser = (req as any).user;
    const userId = decodedUser?.userId || decodedUser?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const task = await taskService.getTaskById(id, userId);

    if (!task) {
      return res.status(404).json({ message: "Task not found or unauthorized" });
    }

    return res.json(task);
  } catch (error) {
    console.error("❌ Error en getTaskById:", error);
    return res.status(500).json({ message: "Error fetching task" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const decodedUser = (req as any).user;
    const userId = decodedUser?.userId || decodedUser?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const task = await taskService.getTaskByIdOnly(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ message: "Forbidden: You cannot delete this task" });
    }

    await taskService.deleteTask(id);
    return res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("❌ Error en deleteTask:", error);
    return res.status(500).json({ message: "Error deleting task" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;
    const decodedUser = (req as any).user;
    const userId = decodedUser?.userId || decodedUser?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const task = await taskService.getTaskByIdOnly(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ message: "Forbidden: You cannot update this task" });
    }

    const updatedTask = await taskService.updateTask(id, { title, description, completed });
    return res.json(updatedTask);
  } catch (error) {
    console.error("❌ Error en updateTask:", error);
    return res.status(500).json({ message: "Error updating task" });
  }
};