import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './app';

describe('HTTP telemetry', () => {
  it('returns the request ID for log and trace correlation', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('x-request-id', 'telemetry-test-123');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('telemetry-test-123');
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
