import { JwtPayload } from 'jsonwebtoken';

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

// Esto es crucial: fuerza a TS a tratar este archivo como un módulo
export {};