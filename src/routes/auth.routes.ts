import { Router } from 'express';
import { register, login, me } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 * post:
 * summary: Registrar un nuevo usuario
 * tags:
 * - Autenticación
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - email
 * - password
 * properties:
 * email:
 * type: string
 * example: test@gmail.com
 * password:
 * type: string
 * example: superpassword123
 * responses:
 * 201:
 * description: Usuario creado con éxito
 * 400:
 * description: Error de validación de datos (Zod)
 */
router.post('/register', validate(registerSchema), register);

/**
 * @openapi
 * /api/auth/login:
 * post:
 * summary: Iniciar sesión de usuario
 * tags:
 * - Autenticación
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - email
 * - password
 * properties:
 * email:
 * type: string
 * example: test@gmail.com
 * password:
 * type: string
 * example: superpassword123
 * responses:
 * 200:
 * description: Login correcto, devuelve el token JWT
 * 401:
 * description: Credenciales incorrectas
 */
router.post('/login', validate(loginSchema), login);

/**
 * @openapi
 * /api/auth/me:
 * get:
 * summary: Obtener el perfil del usuario autenticado
 * tags:
 * - Autenticación
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Datos del usuario obtenidos correctamente
 * 401:
 * description: Token inválido o no proporcionado
 */
router.get('/me', authMiddleware, me);

export default router;