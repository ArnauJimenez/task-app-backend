import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../config/logger';
import { AgentService } from '../agent.service';
import type { LLMClientAdapter } from '../types';
import type { ToolExecutor } from '../tools/executor';

const toolExecutor = {
  execute: vi.fn<ToolExecutor['execute']>(),
};

const llmAdapter = {
  complete: vi.fn<LLMClientAdapter['complete']>(),
};

describe('AgentService', () => {
  let agent: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(logger, 'debug').mockImplementation(() => undefined);
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    agent = new AgentService(toolExecutor, llmAdapter);
  });

  it('executes tool calls with the user scope and returns the final LLM response', async () => {
    const call = {
      id: 'call-1',
      name: 'get_tasks',
      args: {},
      thoughtSignature: 'signed-function-call-payload',
    };
    const toolResult = { success: true, data: [] } as const;
    toolExecutor.execute.mockResolvedValueOnce(toolResult);
    llmAdapter.complete
      .mockResolvedValueOnce({ text: 'I will check.', toolCalls: [call] })
      .mockResolvedValueOnce({ text: 'You have no tasks.' });

    const response = await agent.run('user-123', 'List my tasks');

    expect(response).toEqual({
      message: 'You have no tasks.',
      executedTools: [{ name: 'get_tasks', args: {}, result: toolResult }],
    });
    expect(toolExecutor.execute).toHaveBeenCalledWith('get_tasks', {}, 'user-123');

    const nextRequest = llmAdapter.complete.mock.calls[1][0];
    expect(nextRequest.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'assistant', toolCalls: [call] }),
      expect.objectContaining({
        role: 'tool',
        toolCallId: 'call-1',
        content: JSON.stringify(toolResult),
      }),
    ]));
  });

  it('rejects empty user identities before calling the LLM', async () => {
    await expect(agent.run('  ', 'List my tasks'))
      .rejects.toThrow('authenticated user');

    expect(llmAdapter.complete).not.toHaveBeenCalled();
  });

  it('stops after the maximum number of tool-call turns', async () => {
    llmAdapter.complete.mockResolvedValue({
      toolCalls: [{ id: 'call-1', name: 'get_tasks', args: {} }],
    });
    toolExecutor.execute.mockResolvedValue({ success: true, data: [] });

    await expect(agent.run('user-123', 'List my tasks'))
      .rejects.toThrow('maximum execution turns limit (5)');

    expect(llmAdapter.complete).toHaveBeenCalledTimes(5);
    expect(toolExecutor.execute).toHaveBeenCalledTimes(5);
  });

  it('rejects a response that exceeds the maximum tool calls per run', async () => {
    llmAdapter.complete.mockResolvedValueOnce({
      toolCalls: Array.from({ length: 11 }, (_, index) => ({
        id: `call-${index}`,
        name: 'get_tasks',
        args: {},
      })),
    });

    await expect(agent.run('user-123', 'List my tasks'))
      .rejects.toThrow('maximum tool call limit (10)');

    expect(toolExecutor.execute).not.toHaveBeenCalled();
  });
});
