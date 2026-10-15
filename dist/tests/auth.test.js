"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app"); // 👈 Añadidas las llaves
const client_1 = require("../prisma/client");
(0, vitest_1.describe)('Pruebas de Autenticación (Auth Endpoints)', () => {
    // Limpieza: Antes de ejecutar los tests, borramos el usuario de prueba por si acaso
    (0, vitest_1.beforeAll)(async () => {
        await client_1.prisma.user.deleteMany({
            where: { email: 'test_test@gmail.com' },
        });
    });
    // Desconectar Prisma al terminar todos los tests para no dejar conexiones colgadas
    (0, vitest_1.afterAll)(async () => {
        await client_1.prisma.$disconnect();
    });
    (0, vitest_1.test)('Debería rebotar el registro si los datos no pasan la validación de Zod', async () => {
        const response = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/register')
            .send({
            email: 'email-invalido', // Zod saltará aquí
            password: '123' // Muy corto
        });
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(response.body.status).toBe('fail');
        (0, vitest_1.expect)(response.body.errors).toBeDefined();
    });
    (0, vitest_1.test)('Debería registrar un nuevo usuario correctamente', async () => {
        const response = await (0, supertest_1.default)(app_1.app)
            .post('/api/auth/register')
            .send({
            email: 'test_test@gmail.com',
            password: 'superpassword123'
        });
        (0, vitest_1.expect)(response.status).toBe(201);
        (0, vitest_1.expect)(response.body).toHaveProperty('id');
        (0, vitest_1.expect)(response.body.email).toBe('test_test@gmail.com');
    });
});
