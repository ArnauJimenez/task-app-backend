import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Validamos únicamente el req.body, que es lo que envía el usuario
    const result = await schema.safeParseAsync(req.body);

    if (!result.success) {
      // Al tipar 'err' como any, TypeScript nos deja mapear sin protestar
      const errorMessages = (result as any).error.errors.map((err: any) => ({
        field: err.path[0] || "field",
        message: err.message,
      }));

      res.status(400).json({ errors: errorMessages });
      return;
    }

    next();
  };
};