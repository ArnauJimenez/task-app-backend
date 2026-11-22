import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { prisma } from './lib/prisma';
import { app } from './app';

const originalCorsOrigin = process.env.CORS_ORIGIN;
const originalFrontendUrl = process.env.FRONTEND_URL;

afterEach(() => {
  if (originalCorsOrigin === undefined) delete process.env.CORS_ORIGIN;
  else process.env.CORS_ORIGIN = originalCorsOrigin;

  if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = originalFrontendUrl;
});

describe('HTTP telemetry', () => {
  it('answers CORS preflight requests before route authentication', async () => {
    delete process.env.CORS_ORIGIN;
    delete process.env.FRONTEND_URL;

    const response = await request(app)
      .options('/api/tasks')
      .set('Origin', 'http://localhost:8080')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8080');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });

  it('returns the request ID for log and trace correlation', async () => {
    vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([1] as never);
    const response = await request(app)
      .get('/health')
      .set('x-request-id', 'telemetry-test-123');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'connected' });
    expect(response.headers['x-request-id']).toBe('telemetry-test-123');
  });

  it('returns service unavailable when PostgreSQL cannot be reached', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('database unavailable'));

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error', database: 'unavailable' });
  });

  it('returns bad request for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: 'Invalid JSON payload',
    });
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  it('routes Express errors through the Sentry and global error handlers', async () => {
    const response = await request(app).get('/debug-sentry');

    expect(response.status).toBe(500);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body).toMatchObject({
      success: false,
      error: 'Internal server error',
    });
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });
});
