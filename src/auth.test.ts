import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from './app';
import { prisma } from './lib/prisma';

const testEmails: string[] = [];

function createTestEmail() {
  const email = `ci-test-${randomUUID()}@example.com`;
  testEmails.push(email);
  return email;
}

beforeEach(() => {
  testEmails.length = 0;
});

afterEach(async () => {
  if (testEmails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
  }
});

describe('POST /api/auth/register', () => {
  it('debería registrar un nuevo usuario correctamente', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: createTestEmail(), password: 'Password123!' });
    expect(res.status).toBe(201);
  });
  it('debería fallar si faltan datos', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: createTestEmail() });
    expect(res.status).toBe(400);
  });
  it('debería fallar si el usuario ya existe', async () => {
    const email = createTestEmail();
    await request(app).post('/api/auth/register').send({ email, password: 'Password123!' });
    const res = await request(app).post('/api/auth/register').send({ email, password: 'Password123!' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('debería hacer login correctamente', async () => {
    const email = createTestEmail();
    await request(app).post('/api/auth/register').send({ email, password: 'Password123!' });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
    expect(res.status).toBe(200);
  });
  it('debería fallar con contraseña incorrecta', async () => {
    const email = createTestEmail();
    await request(app).post('/api/auth/register').send({ email, password: 'Password123!' });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPassword!' });
    expect(res.status).toBe(400);
  });
});
