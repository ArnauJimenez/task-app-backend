import { logger } from '../config/logger';
import { ToolExecutor } from './tools/executor';
import { getFormattedAgentTools } from './provider';
import type {
  AgentMessage,
  AgentResponse,
  ExecutedToolRecord,
  LLMClientAdapter,
} from './types';

const MAX_TURNS = 5;
const MAX_TOOL_CALLS = 10;

export class AgentService {
  constructor(
    private readonly toolExecutor: Pick<ToolExecutor, 'execute'>,
    private readonly llmAdapter: LLMClientAdapter,
  ) {}

  async run(userId: string, userPrompt: string): Promise<AgentResponse> {
    if (!userId.trim()) {
      throw new Error('An authenticated user is required to run the agent.');
    }
    if (!userPrompt.trim()) {
      throw new Error('A user prompt is required to run the agent.');
    }

    const history: AgentMessage[] = [
      {
        role: 'system',
        content: 'You are an AI assistant for task-management-app. Use the available tools to manage tasks for the authenticated user.',
      },
      { role: 'user', content: userPrompt },
    ];
    const executedTools: ExecutedToolRecord[] = [];
    const availableTools = getFormattedAgentTools();
    let totalToolCalls = 0;

    for (let turn = 0; turn < MAX_TURNS; turn += 1) {
      logger.debug({ turn: turn + 1, maxTurns: MAX_TURNS }, 'Starting agent turn');
      const completion = await this.llmAdapter.complete({
        messages: history,
        tools: availableTools,
      });

      if (!completion.toolCalls?.length) {
        logger.debug({
          turn: turn + 1,
          executedToolCount: executedTools.length,
        }, 'Agent returned a final response');
        return {
          message: completion.text?.trim() || 'Task completed.',
          executedTools,
        };
      }

      if (totalToolCalls + completion.toolCalls.length > MAX_TOOL_CALLS) {
        logger.warn({
          turn: turn + 1,
          requestedToolCalls: completion.toolCalls.length,
          executedToolCount: totalToolCalls,
          maxToolCalls: MAX_TOOL_CALLS,
        }, 'Agent reached the maximum tool call limit');
        throw new Error(`Agent exceeded maximum tool call limit (${MAX_TOOL_CALLS}).`);
      }

      history.push({
        role: 'assistant',
        content: completion.text ?? '',
        toolCalls: completion.toolCalls,
      });

      for (const call of completion.toolCalls) {
        totalToolCalls += 1;
        logger.debug({
          turn: turn + 1,
          toolName: call.name,
          toolCallNumber: totalToolCalls,
        }, 'Executing agent tool');
        const executionResult = await this.toolExecutor.execute(call.name, call.args, userId);

        executedTools.push({
          name: call.name,
          args: call.args,
          result: executionResult,
        });

        history.push({
          role: 'tool',
          name: call.name,
          toolCallId: call.id,
          content: JSON.stringify(executionResult),
        });
      }
    }

    logger.warn({
      userId,
      maxTurns: MAX_TURNS,
      executedToolCount: totalToolCalls,
    }, 'Agent reached the maximum turn limit without a final response');
    throw new Error(`Agent exceeded maximum execution turns limit (${MAX_TURNS}).`);
  }
}
