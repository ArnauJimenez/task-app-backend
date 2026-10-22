"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.createTaskSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// 1. Definición de los esquemas de validación
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
    email: zod_1.z.string().email('El formato del correo electrónico es inválido'),
    password: zod_1.z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('El formato del correo electrónico es inválido'),
    password: zod_1.z.string().min(1, 'La contraseña es obligatoria'),
});
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'El título de la tarea no puede estar vacío').max(255, 'El título es demasiado largo'),
});
// 2. Middleware genérico para validar peticiones con Zod
const validate = (schema) => {
    return (req, res, next) => {
        try {
            // Valida y parsea el body de la petición
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                // Usamos .issues en lugar de .errors
                res.status(400).json({
                    error: 'Datos de entrada inválidos',
                    details: error.issues.map((err) => err.message),
                });
                return;
            }
            res.status(500).json({ error: 'Error interno de validación' });
        }
    };
};
exports.validate = validate;
