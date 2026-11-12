import './instrument';
import cors from 'cors';
import express from 'express';
import * as Sentry from '@sentry/node';
import { logger } from './config/logger';
import { pinoHttpMiddleware } from './middlewares/logger.middleware';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';
import chatRoutes from './routes/chat.routes';
import agentRoutes from './routes/agent.routes';

export const app = express();

app.use(pinoHttpMiddleware);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend funcionando correctamente' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

if (process.env.NODE_ENV !== 'production' || process.env.SENTRY_DEBUG_ROUTE_ENABLED === 'true') {
  app.get('/debug-sentry', () => {
    throw new Error('My first Sentry error!');
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/agent', agentRoutes);

Sentry.setupExpressErrorHandler(app);

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  logger.error({ err: error, requestId: req.id }, 'Unhandled Express request error');
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: req.id,
  });
});
