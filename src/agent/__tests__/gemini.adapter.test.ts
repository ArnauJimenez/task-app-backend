import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../config/logger';
import { GeminiLLMAdapter } from '../gemini.adapter';
import { getFormattedAgentTools } from '../provider';
import type { LLMCompletionOptions } from '../types';

const options: LLMCompletionOptions = {
  messages: [
    { role: 'system', content: 'Manage the current user tasks.' },
    { role: 'user', content: 'List my tasks.' },
  ],
  tools: [{
    name: 'get_tasks',
    description: 'List tasks.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer', description: 'Maximum tasks.' } },
      required: [],
    },
  }],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(logger, 'debug').mockImplementation(() => undefined);
  vi.spyOn(logger, 'error').mockImplementation(() => undefined);
});

describe('GeminiLLMAdapter', () => {
  it('sends the create_task declaration with title and description properties', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Task created.' }] } }],
      }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await new GeminiLLMAdapter('test-key').complete({
      ...options,
      tools: getFormattedAgentTools(),
    });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const createTask = requestBody.tools[0].functionDeclarations
      .find((tool: { name: string }) => tool.name === 'create_task');
    expect(createTask.parameters.properties).toMatchObject({
      title: { type: 'STRING' },
      description: { type: 'STRING' },
    });
    expect(createTask.parameters.required).toContain('title');
  });

  it('sends the update_task declaration with all editable task fields', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Task updated.' }] } }],
      }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await new GeminiLLMAdapter('test-key').complete({
      ...options,
      tools: getFormattedAgentTools(),
    });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const updateTask = requestBody.tools[0].functionDeclarations
      .find((tool: { name: string }) => tool.name === 'update_task');
    expect(updateTask.parameters.properties).toMatchObject({
      id: { type: 'STRING' },
      title: { type: 'STRING' },
      description: { type: 'STRING' },
      completed: { type: 'BOOLEAN' },
    });
    expect(updateTask.parameters.required).toEqual(['id']);
  });

  it('translates provider function calls and request schemas', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              functionCall: { name: 'get_tasks', args: { limit: 3 } },
              thoughtSignature: 'signed-function-call-payload',
            }],
          },
        }],
      }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await new GeminiLLMAdapter('test-key').complete(options);

    expect(result).toMatchObject({
      toolCalls: [{
        name: 'get_tasks',
        args: { limit: 3 },
        thoughtSignature: 'signed-function-call-payload',
      }],
    });
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(requestBody.systemInstruction.parts[0].text).toBe('Manage the current user tasks.');
    expect(requestBody.tools[0].functionDeclarations[0].parameters.properties.limit.type)
      .toBe('INTEGER');
  });

  it('sends prior tool results back as function responses', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Done.' }] } }],
      }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await new GeminiLLMAdapter('test-key').complete({
      ...options,
      messages: [
        ...options.messages,
        {
          role: 'assistant',
          content: '',
          toolCalls: [{
            id: 'call-1',
            name: 'get_tasks',
            args: {},
            thoughtSignature: 'signed-function-call-payload',
          }],
        },
        {
          role: 'tool',
          name: 'get_tasks',
          toolCallId: 'call-1',
          content: '{"success":true,"data":[]}',
        },
      ],
    });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(requestBody.contents.at(-2)).toEqual({
      role: 'model',
      parts: [{
        functionCall: { name: 'get_tasks', args: {} },
        thoughtSignature: 'signed-function-call-payload',
      }],
    });
    expect(requestBody.contents.at(-1)).toEqual({
      role: 'user',
      parts: [{
        functionResponse: {
          name: 'get_tasks',
          response: { success: true, data: [] },
        },
      }],
    });
  });

  it('fails explicitly when no Gemini API key is configured', async () => {
    await expect(new GeminiLLMAdapter('').complete(options))
      .rejects.toThrow('GEMINI_API_KEY is missing');
  });

  it('includes the provider error message when Gemini rejects a request', async () => {
    const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        error: {
          message: 'Requested model was not found.',
          status: 'NOT_FOUND',
          details: [{ reason: 'MODEL_NOT_FOUND' }],
        },
      }), { status: 404 }),
    ));

    await expect(new GeminiLLMAdapter('test-key').complete(options))
      .rejects.toThrow('Requested model was not found.');
    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 404,
        providerError: {
          message: 'Requested model was not found.',
          status: 'NOT_FOUND',
          details: [{ reason: 'MODEL_NOT_FOUND' }],
        },
        attempt: 1,
      }),
      'Gemini API request failed',
    );
  });

  it('retries transient Gemini errors with backoff and logs provider details', async () => {
    const warningLog = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: 'The service is temporarily unavailable.' },
      }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Done.' }] } }],
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new GeminiLLMAdapter('test-key').complete(options))
      .resolves.toEqual({ text: 'Done.' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(warningLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 503,
        providerError: { message: 'The service is temporarily unavailable.' },
        attempt: 1,
        maxAttempts: 3,
        retryInMs: 500,
      }),
      'Gemini API returned a transient error; retrying',
    );
  });

  it('aborts requests at the configured timeout and logs the timeout', async () => {
    vi.useFakeTimers();
    const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_input, init) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      })
    ));
    vi.stubGlobal('fetch', fetchMock);

    const completion = new GeminiLLMAdapter('test-key', 'gemini-3.6-flash', 1_000).complete(options);
    const timeoutExpectation = expect(completion).rejects.toThrow('timed out after 1000ms');
    await vi.advanceTimersByTimeAsync(1_000);

    await timeoutExpectation;
    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3.6-flash', timeoutMs: 1_000 }),
      'Gemini request timed out',
    );
  });

  it('logs and rejects invalid JSON returned by Gemini', async () => {
    const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response('not-json', { status: 200 }),
    ));

    await expect(new GeminiLLMAdapter('test-key').complete(options))
      .rejects.toThrow('Failed to parse Gemini response JSON');
    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3.6-flash', status: 200 }),
      'Failed parsing Gemini response JSON',
    );
  });
});
