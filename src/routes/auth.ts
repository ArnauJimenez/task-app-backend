import { Router } from 'express';
import { validate, registerSchema, loginSchema } from '../middlewares/validate';
// ... tus controladores o lógica de registro/login ...

const router = Router();

// Aplicamos el validador en el registro
router.post('/register', validate(registerSchema), async (req, res) => {
  // Tu lógica de registro actual...
});

// Aplicamos el validador en el login
router.post('/login', validate(loginSchema), async (req, res) => {
  // Tu lógica de login actual...
});

export default router;