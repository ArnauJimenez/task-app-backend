import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger';

export const pinoHttpMiddleware = pinoHttp({
  logger,
  genReqId(req, res) {
    const requestId = req.headers['x-request-id'];
    const id = typeof requestId === 'string' && /^[\w.-]{1,128}$/.test(requestId)
      ? requestId
      : randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel(_req, res, error) {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: () => 'HTTP request completed',
  customErrorMessage: () => 'HTTP request failed',
});
