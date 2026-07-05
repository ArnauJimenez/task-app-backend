import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. Ampliamos el tipo Request de Express de forma directa y local en este archivo
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

interface CustomJwtPayload extends jwt.JwtPayload {
  userId: string;
  role: string;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") return next();

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return res.status(401).json({ message: "Invalid token format" });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "tu_secret_por_si_acaso"
    ) as CustomJwtPayload;

    // Ahora TS sabe al 100% que req.user existe porque lo hemos declarado arriba
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};