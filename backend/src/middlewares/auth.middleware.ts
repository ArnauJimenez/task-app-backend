import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extendemos el tipo Request de Express para guardar el userId
export interface AuthRequest extends Request {
  userId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro';

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = verified.userId; // Guardamos el ID del usuario en la petición
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};