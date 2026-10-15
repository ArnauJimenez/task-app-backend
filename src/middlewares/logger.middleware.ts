import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Escuchamos cuando la respuesta termina de enviarse al cliente
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    // Color o formato visual limpio para la consola
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${status} (${duration}ms)`);
  });

  next();
};

