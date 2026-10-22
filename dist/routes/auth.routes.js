"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_service_1 = require("../services/auth.service");
const router = (0, express_1.Router)();
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        const newUser = await auth_service_1.authService.register(name || 'Usuario', email, password);
        res.status(201).json({ message: 'Usuario registrado con éxito', user: newUser });
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Error en el registro' });
    }
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        const result = await auth_service_1.authService.login(email, password);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Error en el inicio de sesión' });
    }
});
exports.default = router;
