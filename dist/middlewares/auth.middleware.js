"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access token missing or malformed" });
    }
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "secreto_super_seguro";
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        if (typeof decoded === "string") {
            return res.status(403).json({ message: "Invalid or expired token" });
        }
        const userId = typeof decoded.userId === "string" ? decoded.userId : decoded.id;
        if (typeof userId !== "string") {
            return res.status(403).json({ message: "Invalid or expired token" });
        }
        req.user = {
            id: userId,
            email: typeof decoded.email === "string" ? decoded.email : undefined,
            role: typeof decoded.role === "string" ? decoded.role : undefined,
        };
        next();
    }
    catch (error) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};
exports.verifyToken = verifyToken;
