"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
exports.app = (0, express_1.default)();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
exports.app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true
}));
exports.app.use(express_1.default.json());
exports.app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
exports.app.use('/api/auth', auth_routes_1.default);
exports.app.use('/api/tasks', task_routes_1.default);
exports.app.use('/api/chat', chat_routes_1.default);
