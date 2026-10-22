"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
// Instanciamos Prisma directamente aquí (cero líos de rutas relativas)
const prisma = new client_1.PrismaClient();
const auth_validator_1 = require("../validators/auth.validator");
// =========================
// REGISTER
// =========================
const register = async (req, res) => {
    try {
        const validatedData = auth_validator_1.registerSchema.parse({ body: req.body });
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.body.email },
        });
        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }
        const hashedPassword = await bcrypt_1.default.hash(validatedData.body.password, 10);
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
    }
    catch (error) {
        console.error("❌ ERROR en register:", error);
        return res.status(500).json({
            message: "Register failed",
        });
    }
};
exports.register = register;
// =========================
// LOGIN
// =========================
const login = async (req, res) => {
    try {
        const validatedData = auth_validator_1.loginSchema.parse({ body: req.body });
        const user = await prisma.user.findUnique({
            where: { email: validatedData.body.email },
        });
        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }
        const isPasswordValid = await bcrypt_1.default.compare(validatedData.body.password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "secreto_super_seguro", // 👈 Fíjate en este texto
        { expiresIn: "1d" });
        return res.json({ token });
    }
    catch (error) {
        console.error("❌ ERROR en login:", error);
        return res.status(500).json({
            message: "Login failed",
        });
    }
};
exports.login = login;
// =========================
// ME
// =========================
const me = async (req, res) => {
    try {
        const decodedUser = req.user;
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
    }
    catch (error) {
        console.error("❌ ERROR en me:", error);
        return res.status(500).json({
            message: "Failed to get user",
        });
    }
};
exports.me = me;
