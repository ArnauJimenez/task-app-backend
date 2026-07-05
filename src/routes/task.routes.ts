import { Router } from "express";
import { createTask, getMyTasks, getTaskById, deleteTask, updateTask } from "../controllers/task.controller";
import { validateRequest } from "../middlewares/validate.middleware";
import { createTaskSchema, updateTaskSchema } from "../schemas/task.schema";
// Importa aquí también tu middleware de autenticación (ej: authMiddleware)

const router = Router();

// Asumiendo que tus rutas ya usan tu middleware de autenticación para sacar el req.user
router.post("/", validateRequest(createTaskSchema), createTask);
router.get("/", getMyTasks);
router.get("/:id", getTaskById);
router.patch("/:id", validateRequest(updateTaskSchema), updateTask);
router.delete("/:id", deleteTask);

export default router;