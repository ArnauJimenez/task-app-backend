import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET: Obtener todas las tareas
router.get('/', async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Crear una nueva tarea
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, userId } = req.body;
    
    if (!userId || !title) {
      return res.status(400).json({ error: 'El título y el userId son obligatorios' });
    }

    const newTask = await prisma.task.create({
      data: { title, description, userId }
    });
    res.status(201).json(newTask);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE: Eliminar una tarea por ID
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id } });
    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (error: any) {
    res.status(404).json({ error: 'No se pudo encontrar la tarea a eliminar' });
  }
});

export default router;