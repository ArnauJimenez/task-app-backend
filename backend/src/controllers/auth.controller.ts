import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { prisma } from "../prisma/client";
import {
  registerSchema,
  loginSchema,
} from "../validators/auth.validator";

// =========================
// REGISTER
// =========================
export const register = async (req: Request, res: Response) => {
  try {
    // Validamos pasando el objeto con la propiedad body tal como pide el esquema
    const validatedData = registerSchema.parse({ body: req.body });

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.body.email },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(validatedData.body.password, 10);

    const user = await prisma.user.create({
      data: {
        email: validatedData.body.email,
        password: hashedPassword,
      },
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Register failed",
    });
  }
};

// =========================
// LOGIN
// =========================
export const login = async (req: Request, res: Response) => {
  try {
    // Validamos pasando el objeto con la propiedad body tal como pide el esquema
    const validatedData = loginSchema.parse({ body: req.body });

    const user = await prisma.user.findUnique({
      where: { email: validatedData.body.email },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      validatedData.body.password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET || "tu_secret_por_si_acaso",
      {
        expiresIn: "7d",
      }
    );

    return res.json({ token });

  } catch (error) {
    return res.status(500).json({
      message: "Login failed",
    });
  }
};

// =========================
// ME
// =========================
export const me = async (req: Request, res: Response) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const decodedUser = (req as any).user;

    const user = await prisma.user.findUnique({
      where: {
        id: decodedUser?.userId,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(user);

  } catch (error) {
    return res.status(500).json({
      message: "Failed to get user",
    });
  }
};