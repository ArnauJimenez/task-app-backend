import express from 'express';
import cors from 'cors';
import helmet from 'helmet'; // 1. Importamos Helmet
import { env } from './config/env'; // 2. Importamos nuestras env validadas
import authRoutes from './routes/auth.routes'; 
import taskRoutes from './routes/task.routes'; 

const swaggerUi = require('swagger-ui-express');

export const app = express();

// 🛡️ MIDDLEWARES DE SEGURIDAD Y PARSEO (Siempre arriba)
app.use(helmet()); // 👈 ¡ACTIVADO! Añade cabeceras de seguridad y oculta "X-Powered-By"
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE SWAGGER ESTABLE Y COMPLETA ---
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API de Gestión de Tareas',
    version: '1.0.0',
    description: 'Backend completo con autenticación JWT y CRUD de tareas',
  },
  servers: [{ url: `http://localhost:${env.PORT}` }], // 👈 Usamos el puerto validado dinámicamente
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    // 🔐 RUTAS DE AUTENTICACIÓN
    '/api/auth/register': {
      post: {
        summary: 'Registrar un nuevo usuario',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } }
        },
        responses: { '201': { description: 'Usuario creado con éxito' } }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Iniciar sesión',
        tags: ['Autenticación'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } }
        },
        responses: { '200': { description: 'Login correcto' } }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'Obtener perfil del usuario',
        tags: ['Autenticación'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Perfil obtenido' } }
      }
    },
    // 📋 RUTAS DE TAREAS
    '/api/tasks': {
      get: {
        summary: 'Obtener todas las tareas del usuario',
        tags: ['Tareas'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Lista de tareas' } }
      },
      post: {
        summary: 'Crear una nueva tarea',
        tags: ['Tareas'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' } } } } }
        },
        responses: { '201': { description: 'Tarea creada con éxito' } }
      }
    },
    '/api/tasks/{id}': {
      get: {
        summary: 'Obtener una tarea por ID',
        tags: ['Tareas'],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Tarea encontrada' } }
      },
      patch: {
        summary: 'Actualizar una tarea',
        tags: ['Tareas'],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, status: { type: 'string' } } } } }
        },
        responses: { '200': { description: 'Tarea actualizada' } }
      },
      delete: {
        summary: 'Eliminar una tarea',
        tags: ['Tareas'],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Tarea eliminada' } }
      }
    }
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
console.log(`📝 Swagger UI configurado de forma estática y segura en http://localhost:${env.PORT}/api-docs`);
// ----------------------------------------------------

app.get('/', (req, res) => {
  res.json({ message: "¡Servidor corriendo perfectamente!" });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);