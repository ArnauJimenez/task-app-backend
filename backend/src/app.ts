import cors from 'cors';
import express from 'express';
import * as Sentry from '@sentry/node';
import { requestLogger } from './middlewares/logger.middleware';
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';
import chatRoutes from './routes/chat.routes';

export const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(requestLogger);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/chat', chatRoutes);

if (process.env.NODE_ENV !== 'production' || process.env.SENTRY_DEBUG_ROUTE_ENABLED === 'true') {
  app.get('/debug-sentry', () => {
    throw new Error('My first Sentry error!');
  });
}

Sentry.setupExpressErrorHandler(app);
