"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middlewares/validate");
// ... tus controladores o lógica de registro/login ...
const router = (0, express_1.Router)();
// Aplicamos el validador en el registro
router.post('/register', (0, validate_1.validate)(validate_1.registerSchema), async (req, res) => {
    // Tu lógica de registro actual...
});
// Aplicamos el validador en el login
router.post('/login', (0, validate_1.validate)(validate_1.loginSchema), async (req, res) => {
    // Tu lógica de login actual...
});
exports.default = router;
