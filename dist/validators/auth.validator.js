"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// Esquema para el Registro
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email({ message: "Email no válido" }),
        password: zod_1.z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
        name: zod_1.z.string().min(2, { message: "El nombre es obligatorio" }).optional(),
    }),
});
// Esquema para el Login (¡El que faltaba!)
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email({ message: "Email no válido" }),
        password: zod_1.z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
    }),
});
