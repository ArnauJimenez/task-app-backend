"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const auth_validator_1 = require("../validators/auth.validator");
const router = (0, express_1.Router)();
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
router.post('/register', (0, validate_middleware_1.validate)(auth_validator_1.registerSchema), auth_controller_1.register);
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
router.post('/login', (0, validate_middleware_1.validate)(auth_validator_1.loginSchema), auth_controller_1.login);
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
router.get('/me', auth_middleware_1.authMiddleware, auth_controller_1.me);
exports.default = router;
