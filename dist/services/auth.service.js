"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_super_seguro';
exports.authService = {
    // Registro de usuario
    register: async (name, email, password) => {
        // 1. Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new Error('El correo ya está registrado');
        }
        // 2. Encriptar la contraseña
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
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
    login: async (email, password) => {
        // 1. Buscar usuario
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Credenciales inválidas');
        }
        // 2. Verificar contraseña
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Credenciales inválidas');
        }
        // 3. Generar Token JWT (expira en 24 horas)
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
        return {
            token,
            user: { id: user.id, name: user.name, email: user.email },
        };
    },
};
