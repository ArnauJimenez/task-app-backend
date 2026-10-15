import { Router } from "express";
import { 
  createTask, 
  getMyTasks, 
  getTaskById, 
  updateTask, 
  deleteTask 
} from "../controllers/task.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken);

router.post("/", createTask);
router.get("/", getMyTasks);
router.get("/:id", getTaskById);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;