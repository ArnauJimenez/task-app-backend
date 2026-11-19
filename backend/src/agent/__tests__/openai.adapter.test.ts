import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../config/logger';
import { OpenAILLMAdapter } from '../openai.adapter';
import { getFormattedAgentTools } from '../provider';
import type { LLMCompletionOptions } from '../types';

const options: LLMCompletionOptions = {
  messages: [
    { role: 'system', content: 'Manage the current user tasks.' },
    { role: 'user', content: 'List my tasks.' },
  ],
  tools: getFormattedAgentTools(),
};

beforeEach(() => {
  vi.stubEnv('PRIMARY_LLM_API_KEY', 'primary-key');
  vi.stubEnv('PRIMARY_LLM_BASE_URL', '');
  vi.stubEnv('PRIMARY_LLM_MODEL', '');
  vi.stubEnv('LLM_API_KEY', '');
  vi.stubEnv('LLM_BASE_URL', '');
  vi.stubEnv('LLM_MODEL', '');
  vi.stubEnv('SECONDARY_LLM_API_KEY', 'secondary-key');
  vi.stubEnv('SECONDARY_LLM_BASE_URL', '');
  vi.stubEnv('SECONDARY_LLM_MODEL', '');
  vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  vi.spyOn(logger, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('OpenAILLMAdapter', () => {
  it('sends tool schemas and parses tool calls', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: {
        content: null,
        tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'get_tasks', arguments: '{"limit":3}' } }],
      } }],
    })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new OpenAILLMAdapter().complete(options)).resolves.toEqual({
      toolCalls: [{ id: 'call-1', name: 'get_tasks', args: { limit: 3 } }],
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      messages: unknown;
      tools: Array<{ type: string; function: { name: string; parameters: { properties: Record<string, unknown> } } }>;
    };
    expect(body.messages).toEqual(options.messages);
    expect(body.tools.find((tool) => tool.function.name === 'create_task')).toMatchObject({
      type: 'function',
      function: { parameters: { properties: { title: { type: 'string' }, description: { type: 'string' } } } },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith({ provider: 'primary' }, 'LLM provider handled request');
  });

  it('sends assistant tool calls and results in OpenAI format', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'Done.' } }] })),
    );
    vi.stubGlobal('fetch', fetchMock);
    await new OpenAILLMAdapter().complete({
      ...options,
      messages: [
        ...options.messages,
        { role: 'assistant', content: '', toolCalls: [{ id: 'call-1', name: 'get_tasks', args: {} }] },
        { role: 'tool', name: 'get_tasks', toolCallId: 'call-1', content: '{"success":true}' },
      ],
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { messages: unknown[] };
    expect(body.messages.slice(-2)).toEqual([
      { role: 'assistant', content: null, tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'get_tasks', arguments: '{}' } }] },
      { role: 'tool', tool_call_id: 'call-1', content: '{"success":true}' },
    ]);
  });

  it('fails over on malformed tool arguments instead of executing them', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'delete_task', arguments: 'invalid' } }] } }],
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'Try again.' } }] })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new OpenAILLMAdapter().complete(options)).resolves.toEqual({ text: 'Try again.' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith({ provider: 'primary', reason: 'invalid_response' }, 'LLM provider failed');
    expect(logger.info).toHaveBeenCalledWith({ provider: 'secondary' }, 'LLM provider handled request');
  });

  it('reports an error when no provider can serve the agent', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 })));
    await expect(new OpenAILLMAdapter().complete(options))
      .rejects.toThrow('The agent could not reach an available LLM provider.');
  });
});
