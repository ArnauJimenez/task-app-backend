import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { verifyToken as authenticateToken } from '../middlewares/auth.middleware';
import { validate, createTaskSchema } from '../middlewares/validate';

const router = Router();
const prisma = new PrismaClient();

// GET /api/tasks?search=comprar&completed=true&page=1&limit=10
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    // Extracción y sanitización de Query Params
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const completedParam = typeof req.query.completed === 'string' ? req.query.completed : undefined;
    const page = typeof req.query.page === 'string' ? req.query.page : '1';
    const limit = typeof req.query.limit === 'string' ? req.query.limit : '10';

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Filtros con tipado nativo de Prisma
    const whereClause: Prisma.TaskWhereInput = {
      userId: req.user.id, // TypeScript ya reconoce req.user sin quejas
    };

    if (search) {
      whereClause.title = {
        contains: search,
      };
    }

    if (completedParam !== undefined && completedParam !== '') {
      whereClause.completed = completedParam === 'true';
    }

    // Consulta paralela: datos paginados + contador total
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where: whereClause }),
    ]);

    res.json({
      data: tasks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ error: 'Error al obtener las tareas' });
  }
});

// POST /api/tasks (Con validación Zod incorporada)
router.post('/', authenticateToken, validate(createTaskSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const { title } = req.body;

    const newTask = await prisma.task.create({
      data: {
        title,
        userId: req.user.id, // TypeScript reconoce req.user.id perfectamente
      },
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ error: 'Error al crear la tarea' });
  }
});

export default router;