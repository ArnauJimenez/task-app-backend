"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const task_controller_1 = require("../controllers/task.controller");
console.log("✈️ ¡EL ARCHIVO TASK.ROUTES.TS SE HA CARGADO EN EL SERVIDOR!");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.authMiddleware, (req, res, next) => {
    console.log("📥 ¡HA LLEGADO UNA PETICIÓN POST A /api/tasks!");
    console.log("👉 ¡BODY RECIBIDO!:", req.body);
    next();
}, task_controller_1.createTask);
router.get("/", auth_middleware_1.authMiddleware, task_controller_1.getMyTasks);
router.get("/:id", auth_middleware_1.authMiddleware, task_controller_1.getTaskById);
router.patch("/:id", auth_middleware_1.authMiddleware, task_controller_1.updateTask);
router.delete("/:id", auth_middleware_1.authMiddleware, task_controller_1.deleteTask);
exports.default = router;
