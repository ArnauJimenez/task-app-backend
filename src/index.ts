import express from "express";
import cors from "cors";
import { requestLogger } from "./middlewares/logger.middleware"; // (si usas el logger)
import authRoutes from "./routes/auth.routes";
import taskRoutes from "./routes/task.routes";


const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  // Aquí puedes añadir la URL de tu frontend en Vercel cuando la sepas, por ejemplo:
  // "https://tu-frontend.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir solicitudes sin origen (como Postman o apps móviles) o si está en la lista
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
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