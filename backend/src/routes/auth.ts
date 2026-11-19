import { Router } from 'express';
import { validate, registerSchema, loginSchema } from '../middlewares/validate';
// ... your controllers or registration/login logic ...

const router = Router();

// Apply validation to registration.
router.post('/register', validate(registerSchema), async (req, res) => {
  // Your current registration logic...
});

// Apply validation to login.
router.post('/login', validate(loginSchema), async (req, res) => {
  // Your current login logic...
});

export default router;