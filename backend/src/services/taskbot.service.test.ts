import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../config/logger';
import { generateTaskBotReply } from './taskbot.service';

const db = vi.hoisted(() => ({
  messages: vi.fn(),
  tasks: vi.fn(),
  count: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    message: { findMany: db.messages },
    task: { findMany: db.tasks, count: db.count },
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  vi.stubEnv('LLM_API_KEY', 'test-key');
  vi.stubEnv('LLM_BASE_URL', '');
  vi.stubEnv('LLM_MODEL', '');
  vi.stubEnv('PRIMARY_LLM_API_KEY', '');
  vi.stubEnv('PRIMARY_LLM_BASE_URL', '');
  vi.stubEnv('PRIMARY_LLM_MODEL', '');
  vi.stubEnv('SECONDARY_LLM_API_KEY', '');
  vi.stubEnv('SECONDARY_LLM_BASE_URL', '');
  vi.stubEnv('SECONDARY_LLM_MODEL', '');
  db.messages.mockResolvedValue([
    { content: 'What next?', isBot: false },
    { content: 'Hello', isBot: true },
  ]);
  db.tasks.mockResolvedValue([
    { title: 'Review report', description: 'Today', completed: false },
    { title: 'Done', description: null, completed: true },
  ]);
  db.count.mockImplementation(({ where }: { where: { completed?: boolean } }) =>
    Promise.resolve(where.completed ? 1 : 2),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('generateTaskBotReply', () => {
  it('sends scoped task context and ordered conversation to the configured provider', async () => {
    vi.stubEnv('LLM_BASE_URL', 'https://api.groq.com/openai/v1/');
    vi.stubEnv('LLM_MODEL', 'custom-model');
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: ' Review the report. ' } }] })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateTaskBotReply('conversation-1', 'user-1')).resolves.toBe('Review the report.');

    expect(db.tasks).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
    expect(db.count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(db.messages).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        conversationId: 'conversation-1',
        conversation: { isBot: true, userOneId: 'user-1', userTwoId: 'user-1' },
      },
    }));
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer test-key' });
    const body = JSON.parse(String(options?.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.model).toBe('custom-model');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].content).toContain('"title":"Review report"');
    expect(body.messages.slice(2)).toEqual([
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'What next?' },
    ]);
  });

  it('returns a local summary without calling the provider when the key is missing', async () => {
    vi.stubEnv('LLM_API_KEY', '');
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateTaskBotReply('conversation-1', 'user-1')).resolves.toContain(
      '1 pending task and 1 completed task. One pending task is "Review report".',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses plural task labels when the summary contains multiple tasks', async () => {
    vi.stubEnv('LLM_API_KEY', '');
    db.count.mockImplementation(({ where }: { where: { completed?: boolean } }) =>
      Promise.resolve(where.completed ? 2 : 5),
    );

    await expect(generateTaskBotReply('conversation-1', 'user-1')).resolves.toContain(
      '3 pending tasks and 2 completed tasks.',
    );
  });

  it('uses the default provider and falls back on an HTTP error', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateTaskBotReply('conversation-1', 'user-1')).resolves.toContain('currently unavailable');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.deepseek.com/v1/chat/completions');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { model: string };
    expect(body.model).toBe('deepseek-chat');
  });

  it('falls back for malformed provider responses and reports an empty task list', async () => {
    db.tasks.mockResolvedValue([]);
    db.count.mockResolvedValue(0);
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('not json')));

    await expect(generateTaskBotReply('conversation-1', 'user-1')).resolves.toContain('You have no tasks yet');
  });

  it('falls back when the provider returns no response content', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: null } }] })),
    ));

    await expect(generateTaskBotReply('conversation-1', 'user-1')).resolves.toContain('currently unavailable');
  });

  it('aborts the provider request at 12 seconds and returns a summary', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
    ));

    const reply = generateTaskBotReply('conversation-1', 'user-1');
    await vi.advanceTimersByTimeAsync(11_999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(reply).resolves.toContain('currently unavailable');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('prefers primary settings and does not call the secondary on success', async () => {
    vi.stubEnv('PRIMARY_LLM_API_KEY', 'primary-key');
    vi.stubEnv('PRIMARY_LLM_BASE_URL', 'https://primary.example/v1');
    vi.stubEnv('PRIMARY_LLM_MODEL', 'primary-model');
    vi.stubEnv('SECONDARY_LLM_API_KEY', 'secondary-key');
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'Primary reply' } }] })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateTaskBotReply('conversation-1', 'user-1')).resolves.toBe('Primary reply');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://primary.example/v1/chat/completions');
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer primary-key' });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ model: 'primary-model' });
  });

  it.each([402, 429])('tries the secondary provider after HTTP %i, preserving the conversation context', async (status) => {
    vi.stubEnv('SECONDARY_LLM_API_KEY', 'secondary-key');
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'Secondary reply' } }] })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateTaskBotReply('conversation-1', 'user-1')).resolves.toBe('Secondary reply');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer secondary-key' });
    const primaryBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { messages: unknown };
    const secondaryBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)) as { messages: unknown; model: string };
    expect(secondaryBody.messages).toEqual(primaryBody.messages);
    expect(secondaryBody.model).toBe('openai/gpt-oss-120b');
    expect(logger.warn).toHaveBeenCalledWith(
      { provider: 'primary', reason: 'http_error', status },
      'LLM provider failed',
    );
  });

  it('tries the secondary provider immediately after a primary timeout', async () => {
    vi.useFakeTimers();
    vi.stubEnv('SECONDARY_LLM_API_KEY', 'secondary-key');
    const fetchMock = vi.fn<typeof fetch>()
      .mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'Secondary reply' } }] })));
    vi.stubGlobal('fetch', fetchMock);

    const reply = generateTaskBotReply('conversation-1', 'user-1');
    await vi.advanceTimersByTimeAsync(11_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(reply).resolves.toBe('Secondary reply');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      { provider: 'primary', reason: 'timeout' }, 'LLM provider failed',
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns a local summary when both providers fail', async () => {
    vi.stubEnv('SECONDARY_LLM_API_KEY', 'secondary-key');
    const fetchMock = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('network failure'))
      .mockResolvedValueOnce(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateTaskBotReply('conversation-1', 'user-1')).resolves.toContain('Review report');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      { provider: 'primary', reason: 'network_error' }, 'LLM provider failed',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      { provider: 'secondary', reason: 'http_error', status: 503 }, 'LLM provider failed',
    );
  });

  it('uses the secondary directly when the primary key is missing', async () => {
    vi.stubEnv('LLM_API_KEY', '');
    vi.stubEnv('SECONDARY_LLM_API_KEY', 'secondary-key');
    vi.stubEnv('SECONDARY_LLM_BASE_URL', 'https://secondary.example/v1');
    vi.stubEnv('SECONDARY_LLM_MODEL', 'secondary-model');
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'Secondary reply' } }] })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateTaskBotReply('conversation-1', 'user-1')).resolves.toBe('Secondary reply');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://secondary.example/v1/chat/completions');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ model: 'secondary-model' });
  });

  it('propagates database failures rather than returning an inaccurate summary', async () => {
    db.tasks.mockRejectedValue(new Error('database unavailable'));
    await expect(generateTaskBotReply('conversation-1', 'user-1')).rejects.toThrow('database unavailable');
  });
});
