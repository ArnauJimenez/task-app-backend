import { Router } from 'express';
import { taskService } from '../services/task.service';
import { verifyToken, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// Aplicar el middleware de autenticación a TODAS las rutas de tareas
router.use(verifyToken as any);

// GET /api/tasks - Obtener solo las tareas del usuario logueado
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId; // Obtenemos el ID del usuario del token
    const tasks = await taskService.getUserTasks(userId);
    res.json(tasks);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ error: 'Error al obtener las tareas' });
  }
});

// POST /api/tasks - Crear tarea vinculada al usuario logueado
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.userId;

    if (!title) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }

    const newTask = await taskService.createTask(title, description, userId);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ error: 'Error al crear la tarea' });
  }
});

// PATCH /api/tasks/:id - Actualizar tarea
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updatedTask = await taskService.updateTask(id, req.body);
    res.json(updatedTask);
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    res.status(500).json({ error: 'Error al actualizar la tarea' });
  }
});

// DELETE /api/tasks/:id - Eliminar tarea
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await taskService.deleteTask(id);
    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ error: 'Error al eliminar la tarea' });
  }
});

export default router;