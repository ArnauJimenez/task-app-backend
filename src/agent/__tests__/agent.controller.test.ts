import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../config/logger';
import { AgentController } from '../agent.controller';
import type { AgentService } from '../agent.service';
import { verifyToken } from '../../middlewares/auth.middleware';

const agentService = {
  run: vi.fn<AgentService['run']>(),
};

const app = express();
app.use(express.json());
app.post('/chat', verifyToken, new AgentController(() => agentService).chat);

describe('AgentController', () => {
  const secret = 'agent-controller-test-secret';
  const userId = 'user-123';
  const originalNodeEnv = process.env.NODE_ENV;
  let token: string;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = secret;
    token = jwt.sign({ userId }, secret);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('requires a valid authentication token', async () => {
    const response = await request(app).post('/chat').send({ prompt: 'List my tasks' });

    expect(response.status).toBe(401);
    expect(agentService.run).not.toHaveBeenCalled();
  });

  it('validates the prompt before running the agent', async () => {
    const response = await request(app)
      .post('/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: '   ' });

    expect(response.status).toBe(400);
    expect(agentService.run).not.toHaveBeenCalled();
  });

  it('passes the authenticated user ID and prompt to the agent', async () => {
    const debugLog = vi.spyOn(logger, 'debug').mockImplementation(() => undefined);
    const agentResponse = { message: 'You have no tasks.', executedTools: [] };
    agentService.run.mockResolvedValueOnce(agentResponse);

    const response = await request(app)
      .post('/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: '  List my tasks  ', userId: 'another-user' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: agentResponse });
    expect(agentService.run).toHaveBeenCalledWith(userId, 'List my tasks');
    expect(debugLog).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/chat',
        promptLength: 17,
        authenticated: true,
      }),
      'Agent chat controller entered',
    );
  });

  it('logs detailed provider errors while keeping the API response generic', async () => {
    const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    agentService.run.mockRejectedValueOnce(Object.assign(
      new Error('Gemini API returned HTTP 401: Invalid API key.'),
      {
        code: 'UNAUTHENTICATED',
        response: { status: 401, data: { message: 'Invalid API key.' } },
      },
    ));

    const response = await request(app)
      .post('/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'List my tasks' });

    expect(response.status).toBe(502);
    expect(response.body.error).toContain('could not complete');
    expect(response.body).not.toHaveProperty('stack');
    expect(response.body).not.toHaveProperty('details');
    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        errorDetails: expect.objectContaining({
          message: 'Gemini API returned HTTP 401: Invalid API key.',
          code: 'UNAUTHENTICATED',
          status: 401,
          responseData: { message: 'Invalid API key.' },
        }),
        userId,
      }),
      'Agent chat request failed',
    );
    expect(consoleError).toHaveBeenCalledWith(
      '❌ ERROR REAL DEL AGENTE:',
      expect.objectContaining({
        message: 'Gemini API returned HTTP 401: Invalid API key.',
      }),
    );
  });

  it('catches and logs agent initialization errors', async () => {
    process.env.NODE_ENV = 'development';
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const initializationApp = express();
    initializationApp.use(express.json());
    initializationApp.post('/chat', (req, _res, next) => {
      req.user = { id: userId };
      next();
    }, new AgentController(() => {
      throw new Error('Invalid Gemini timeout configuration.');
    }).chat);

    const response = await request(initializationApp)
      .post('/chat')
      .send({ prompt: 'List my tasks' });

    expect(response.status).toBe(502);
    expect(response.body.error).toBe('Invalid Gemini timeout configuration.');
    expect(response.body.stack).toContain('Invalid Gemini timeout configuration.');
    expect(response.body.details).toBe('Error: Invalid Gemini timeout configuration.');
    expect(consoleError).toHaveBeenCalledWith(
      '❌ ERROR REAL DEL AGENTE:',
      expect.objectContaining({
        message: 'Invalid Gemini timeout configuration.',
      }),
    );
  });
});
