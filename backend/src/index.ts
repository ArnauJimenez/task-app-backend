import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';

// 1. Inicializar Express primero
const app = express();

// 2. Configurar middlewares
app.use(cors());
app.use(express.json());

// 3. Ruta de prueba
app.get('/api', (req, res) => {
  res.json({ message: 'Backend funcionando!' });
});

// 4. Montar las rutas de autenticación y tareas
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// 5. Arrancar el servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});