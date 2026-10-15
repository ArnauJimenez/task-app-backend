import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro';

export const authService = {
  // Registro de usuario
  register: async (name: string, email: string, password: string) => {
    // 1. Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('El correo ya está registrado');
    }

    // 2. Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Crear el usuario en la BD
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return user;
  },

  // Login de usuario
  login: async (email: string, password: string) => {
    // 1. Buscar usuario
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // 2. Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    // 3. Generar Token JWT (expira en 24 horas)
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
    };
  },
};