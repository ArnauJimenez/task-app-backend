import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// REGISTRO DE USUARIO
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword
      }
    });

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: 'Usuario registrado con éxito',
      user: userWithoutPassword
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// INICIO DE SESIÓN (LOGIN)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña obligatorios' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login exitoso',
      user: userWithoutPassword
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;