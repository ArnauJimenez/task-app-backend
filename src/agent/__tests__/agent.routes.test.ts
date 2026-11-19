import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../config/logger';
import { app } from '../../app';

describe('POST /api/agent/chat', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is registered and requires authentication', async () => {
    const debugLog = vi.spyOn(logger, 'debug').mockImplementation(() => undefined);
    const response = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: 'List my tasks' });

    expect(response.status).toBe(401);
    expect(debugLog).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/api/agent/chat',
        promptLength: 13,
      }),
      'Agent chat request received before authentication',
    );
    expect(debugLog).not.toHaveBeenCalledWith(
      expect.anything(),
      'Agent chat controller entered',
    );
  });
});
