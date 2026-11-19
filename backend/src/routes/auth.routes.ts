import { Router } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../config/logger';

const router = Router();

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const newUser = await authService.register(name || 'User', email, password);
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    res.status(400).json({ error: getErrorMessage(error, 'Registration failed') });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: getErrorMessage(error, 'Login failed') });
  }
});

router.post('/demo', async (_req, res) => {
  try {
    const result = await authService.createDemoSession();
    res.status(201).json(result);
  } catch (error) {
    logger.error({ err: error }, 'Could not create demo session');
    res.status(503).json({
      error: 'The demo is temporarily unavailable. Please try again.',
    });
  }
});

export default router;