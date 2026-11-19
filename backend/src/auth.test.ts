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
  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: createTestEmail(), password: 'Password123!' });
    expect(res.status).toBe(201);
  });
  it('rejects missing data', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Required fields are missing');
  });
  it('rejects an existing user', async () => {
    const email = createTestEmail();
    await request(app).post('/api/auth/register').send({ email, password: 'Password123!' });
    const res = await request(app).post('/api/auth/register').send({ email, password: 'Password123!' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('rejects missing data', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Required fields are missing');
  });

  it('logs in successfully', async () => {
    const email = createTestEmail();
    await request(app).post('/api/auth/register').send({ email, password: 'Password123!' });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
    expect(res.status).toBe(200);
  });
  it('rejects an incorrect password', async () => {
    const email = createTestEmail();
    await request(app).post('/api/auth/register').send({ email, password: 'Password123!' });
    const res = await request(app).post('/api/auth/login').send({ email, password: 'WrongPassword!' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/demo', () => {
  it('creates an isolated guest session', async () => {
    const res = await request(app).post('/api/auth/demo').send();

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toMatch(/^demo-.+@guest\.local$/);
    testEmails.push(res.body.user.email);
  });
});
