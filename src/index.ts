import express from "express";
import cors from "cors";
import { requestLogger } from "./middlewares/logger.middleware"; // (si usas el logger)
import authRoutes from "./routes/auth.routes";
import taskRoutes from "./routes/task.routes";


const app = express();

// 1. ⚠️ CORS DEBE IR PRIMERO QUE NADA (Permite que React se comunique)
app.use(cors({
  origin: "http://localhost:5173", // O pon true para permitir cualquier origen en desarrollo
  credentials: true
}));

// 2. Parseador de JSON
app.use(express.json());

// 3. Logger (opcional)
app.use(requestLogger);

// 4. Tus rutas
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:4000`);
});