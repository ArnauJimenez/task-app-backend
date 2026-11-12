import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { prisma } from './lib/prisma';
import { app } from './app';

describe('HTTP telemetry', () => {
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
