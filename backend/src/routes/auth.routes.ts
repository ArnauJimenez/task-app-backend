import { Router } from 'express';
import { authService } from '../services/auth.service';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const newUser = await authService.register(name || 'Usuario', email, password);
    res.status(201).json({ message: 'Usuario registrado con éxito', user: newUser });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error en el registro' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error en el inicio de sesión' });
  }
});

export default router;