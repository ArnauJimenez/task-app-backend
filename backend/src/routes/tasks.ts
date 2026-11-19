import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { verifyToken as authenticateToken } from '../middlewares/auth.middleware';
import { validate, createTaskSchema } from '../middlewares/validate';

const router = Router();
const prisma = new PrismaClient();

// GET /api/tasks?search=buy&completed=true&page=1&limit=10
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Extract and sanitize query parameters.
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const completedParam = typeof req.query.completed === 'string' ? req.query.completed : undefined;
    const page = typeof req.query.page === 'string' ? req.query.page : '1';
    const limit = typeof req.query.limit === 'string' ? req.query.limit : '10';

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Use Prisma's typed filters.
    const whereClause: Prisma.TaskWhereInput = {
      userId: req.user.id,
    };

    if (search) {
      whereClause.title = {
        contains: search,
      };
    }

    if (completedParam !== undefined && completedParam !== '') {
      whereClause.completed = completedParam === 'true';
    }

    // Query the current page and total count in parallel.
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
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Could not fetch tasks' });
  }
});

// POST /api/tasks (with Zod validation)
router.post('/', authenticateToken, validate(createTaskSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { title } = req.body;

    const newTask = await prisma.task.create({
      data: {
        title,
        userId: req.user.id,
      },
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Could not create task' });
  }
});

export default router;