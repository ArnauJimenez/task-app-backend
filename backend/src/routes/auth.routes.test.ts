import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../config/logger';
import { authService, EmailAlreadyRegisteredError } from '../services/auth.service';
import authRoutes from './auth.routes';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/auth/register error handling', () => {
  it('returns 400 for an already registered email', async () => {
    vi.spyOn(authService, 'register').mockRejectedValue(new EmailAlreadyRegisteredError());

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'taken@example.com', password: 'Password123!' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Email is already registered' });
  });

  it('logs infrastructure errors and returns a generic 500 response', async () => {
    const infrastructureError = new Error('Environment variable not found: DATABASE_URL');
    vi.spyOn(authService, 'register').mockRejectedValue(infrastructureError);
    const errorLogger = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'Password123!' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Registration failed' });
    expect(JSON.stringify(response.body)).not.toContain('DATABASE_URL');
    expect(errorLogger).toHaveBeenCalledWith(
      { err: infrastructureError },
      'Could not register user',
    );
  });
});
