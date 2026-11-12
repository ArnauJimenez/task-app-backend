"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("./instrument");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const Sentry = __importStar(require("@sentry/node"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const agent_routes_1 = __importDefault(require("./routes/agent.routes"));
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
exports.app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Backend funcionando correctamente' });
});
exports.app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
if (process.env.NODE_ENV !== 'production' || process.env.SENTRY_DEBUG_ROUTE_ENABLED === 'true') {
    exports.app.get('/debug-sentry', () => {
        throw new Error('My first Sentry error!');
    });
}
exports.app.use('/api/auth', auth_routes_1.default);
exports.app.use('/api/tasks', task_routes_1.default);
exports.app.use('/api/chat', chat_routes_1.default);
exports.app.use('/api/agent', agent_routes_1.default);
Sentry.setupExpressErrorHandler(exports.app);
