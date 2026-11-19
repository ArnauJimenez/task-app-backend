import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro';

export const authService = {
  // User registration
  register: async (name: string, email: string, password: string) => {
    // 1. Check whether the user already exists.
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Email is already registered');
    }

    // 2. Hash the password.
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create the user in the database.
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

  // User login
  login: async (email: string, password: string) => {
    // 1. Find the user.
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 2. Verify the password.
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // 3. Generate a JWT that expires in 24 hours.
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
    };
  },

  createDemoSession: async () => {
    const guestId = randomUUID();
    const hashedPassword = await bcrypt.hash(randomUUID(), 10);
    const user = await prisma.user.create({
      data: {
        name: 'Demo Guest',
        email: `demo-${guestId}@guest.local`,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true },
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    return { token, user };
  },
};