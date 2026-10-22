"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const logger_middleware_1 = require("./middlewares/logger.middleware"); // (si usas el logger)
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const app = (0, express_1.default)();
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    // Aquí puedes añadir la URL de tu frontend en Vercel cuando la sepas, por ejemplo:
    // "https://tu-frontend.vercel.app"
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Permitir solicitudes sin origen (como Postman o apps móviles) o si está en la lista
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
            callback(null, true);
        }
        else {
            callback(new Error("No permitido por CORS"));
        }
    },
    credentials: true
}));
// 2. Parseador de JSON
app.use(express_1.default.json());
// 3. Logger (opcional)
app.use(logger_middleware_1.requestLogger);
// 4. Tus rutas
app.use("/api/auth", auth_routes_1.default);
app.use("/api/tasks", task_routes_1.default);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:4000`);
});
