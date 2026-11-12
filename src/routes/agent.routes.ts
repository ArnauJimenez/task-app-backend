import { Router } from 'express';
import { AgentController } from '../agent/agent.controller';
import { AgentService } from '../agent/agent.service';
import { GeminiLLMAdapter } from '../agent/gemini.adapter';
import { verifyToken } from '../middlewares/auth.middleware';
import { ToolExecutor } from '../agent/tools/executor';
import { logger } from '../config/logger';

const router = Router();
let agentService: AgentService | undefined;
const controller = new AgentController(() => {
  if (!agentService) {
    agentService = new AgentService(new ToolExecutor(), new GeminiLLMAdapter());
  }
  return agentService;
});

router.post('/chat', (req, _res, next) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : undefined;
  logger.debug({
    method: req.method,
    path: req.originalUrl,
    contentType: req.get('content-type'),
    bodyKeys: typeof req.body === 'object' && req.body !== null
      ? Object.keys(req.body)
      : [],
    promptLength: prompt?.length,
  }, 'Agent chat request received before authentication');
  next();
}, verifyToken, controller.chat);

export default router;
