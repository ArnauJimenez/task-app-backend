import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../config/logger';
import type { AgentService } from './agent.service';

const chatRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
});

function getAgentErrorDetails(error: unknown): Record<string, unknown> {
  if (typeof error !== 'object' || error === null) {
    return { message: String(error) };
  }

  const details = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    status?: unknown;
    providerError?: unknown;
    cause?: unknown;
    response?: unknown;
  };
  const response = typeof details.response === 'object' && details.response !== null
    ? details.response as { status?: unknown; data?: unknown }
    : undefined;

  return {
    name: details.name,
    message: details.message,
    code: details.code,
    status: details.status ?? response?.status,
    providerError: details.providerError,
    responseData: response?.data,
    cause: details.cause instanceof Error
      ? { name: details.cause.name, message: details.cause.message }
      : details.cause,
  };
}

export class AgentController {
  constructor(
    private readonly createAgentService: () => Pick<AgentService, 'run'>,
  ) {}

  readonly chat = async (req: Request, res: Response): Promise<void> => {
    let userId: string | undefined;
    try {
      const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : undefined;
      logger.debug({
        method: req.method,
        path: req.originalUrl,
        promptLength: prompt?.length,
        authenticated: Boolean(req.user?.id),
      }, 'Agent chat controller entered');

      userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const parsedBody = chatRequestSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({
          success: false,
          error: 'A non-empty prompt of at most 4000 characters is required.',
        });
        return;
      }

      const agentService = this.createAgentService();
      const data = await agentService.run(userId, parsedBody.data.prompt);
      res.status(200).json({ success: true, data });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('❌ ERROR REAL DEL AGENTE:', error);
      logger.error({
        err: error,
        errorDetails: getAgentErrorDetails(error),
        userId,
      }, 'Agent chat request failed');
      if (process.env.NODE_ENV !== 'production') {
        res.status(502).json({
          success: false,
          error: error.message || 'Error desconocido en el agente',
          stack: error.stack,
          details: error.toString(),
        });
        return;
      }

      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: 'The agent could not complete the request. Please try again later.',
        });
      }
    }
  };
}
