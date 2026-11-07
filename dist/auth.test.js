"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_crypto_1 = require("node:crypto");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("./app");
const prisma_1 = require("./lib/prisma");
const testEmails = [];
function createTestEmail() {
    const email = `ci-test-${(0, node_crypto_1.randomUUID)()}@example.com`;
    testEmails.push(email);
    return email;
}
(0, vitest_1.beforeEach)(() => {
    testEmails.length = 0;
});
(0, vitest_1.afterEach)(async () => {
    if (testEmails.length > 0) {
        await prisma_1.prisma.user.deleteMany({ where: { email: { in: testEmails } } });
    }
});
(0, vitest_1.describe)('POST /api/auth/register', () => {
    (0, vitest_1.it)('debería registrar un nuevo usuario correctamente', async () => {
        const res = await (0, supertest_1.default)(app_1.app).post('/api/auth/register').send({ email: createTestEmail(), password: 'Password123!' });
        (0, vitest_1.expect)(res.status).toBe(201);
    });
    (0, vitest_1.it)('debería fallar si faltan datos', async () => {
        const res = await (0, supertest_1.default)(app_1.app).post('/api/auth/register').send({ email: createTestEmail() });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
    (0, vitest_1.it)('debería fallar si el usuario ya existe', async () => {
        const email = createTestEmail();
        await (0, supertest_1.default)(app_1.app).post('/api/auth/register').send({ email, password: 'Password123!' });
        const res = await (0, supertest_1.default)(app_1.app).post('/api/auth/register').send({ email, password: 'Password123!' });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
(0, vitest_1.describe)('POST /api/auth/login', () => {
    (0, vitest_1.it)('debería hacer login correctamente', async () => {
        const email = createTestEmail();
        await (0, supertest_1.default)(app_1.app).post('/api/auth/register').send({ email, password: 'Password123!' });
        const res = await (0, supertest_1.default)(app_1.app).post('/api/auth/login').send({ email, password: 'Password123!' });
        (0, vitest_1.expect)(res.status).toBe(200);
    });
    (0, vitest_1.it)('debería fallar con contraseña incorrecta', async () => {
        const email = createTestEmail();
        await (0, supertest_1.default)(app_1.app).post('/api/auth/register').send({ email, password: 'Password123!' });
        const res = await (0, supertest_1.default)(app_1.app).post('/api/auth/login').send({ email, password: 'WrongPassword!' });
        (0, vitest_1.expect)(res.status).toBe(400);
    });
});
