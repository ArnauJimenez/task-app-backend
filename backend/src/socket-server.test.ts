import { afterEach, describe, expect, it, vi } from 'vitest';

interface TestMessage {
  id: string;
  conversationId: string;
  content: string;
  senderId: string | null;
  isBot: boolean;
  createdAt: Date;
}

type SendHandler = (
  payload: { conversationId: string; content: string },
  acknowledge: (result: { message?: unknown; error?: string }) => void,
) => void;

interface TestSocket {
  id: string;
  data: { userId: string };
  join: ReturnType<typeof vi.fn>;
  on: (event: string, handler: SendHandler) => void;
}

const mocks = vi.hoisted(() => ({
  connect: undefined as ((socket: TestSocket) => void) | undefined,
  emit: vi.fn(),
  findConversation: vi.fn(),
  findMessages: vi.fn(),
  findTasks: vi.fn(),
  countTasks: vi.fn(),
  createMessage: vi.fn(),
  updateConversation: vi.fn(),
}));

vi.mock('./instrument', () => ({}));
vi.mock('./app', () => ({ app: {} }));
vi.mock('node:http', () => ({ createServer: () => ({ listen: vi.fn() }) }));
vi.mock('socket.io', () => ({
  Server: class {
    use() {}
    on(event: string, handler: (socket: TestSocket) => void) {
      if (event === 'connection') mocks.connect = handler;
    }
    to() { return { emit: mocks.emit }; }
  },
}));
vi.mock('./lib/prisma', () => ({
  prisma: {
    conversation: { findFirst: mocks.findConversation },
    message: { findMany: mocks.findMessages },
    task: { findMany: mocks.findTasks, count: mocks.countTasks },
    $transaction: (callback: (transaction: object) => Promise<TestMessage>) => callback({
      message: { create: mocks.createMessage },
      conversation: { update: mocks.updateConversation },
    }),
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('TaskBot socket', () => {
  it('accepts a user message and emits the saved fallback when no LLM key is configured', async () => {
    vi.stubEnv('LLM_API_KEY', '');
    vi.stubEnv('PRIMARY_LLM_API_KEY', '');
    vi.stubEnv('SECONDARY_LLM_API_KEY', '');
    mocks.findConversation.mockResolvedValue({
      id: 'conversation-1', isBot: true, userOneId: 'user-1', userTwoId: 'user-1',
    });
    mocks.findMessages.mockResolvedValue([{ content: 'Help me', isBot: false }]);
    mocks.findTasks.mockResolvedValue([{ title: 'Review report', description: null, completed: false }]);
    mocks.countTasks.mockImplementation(({ where }: { where: { completed?: boolean } }) =>
      Promise.resolve(where.completed ? 0 : 1),
    );
    mocks.createMessage.mockImplementation(({ data }: {
      data: { conversationId: string; content: string; senderId?: string; isBot?: boolean };
    }) => Promise.resolve({
      id: data.isBot ? 'bot-message' : 'user-message',
      conversationId: data.conversationId,
      content: data.content,
      senderId: data.senderId ?? null,
      isBot: data.isBot ?? false,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    }));
    mocks.updateConversation.mockResolvedValue({});

    await import('./socket-server');
    const handlers = new Map<string, SendHandler>();
    mocks.connect?.({
      id: 'socket-1',
      data: { userId: 'user-1' },
      join: vi.fn(),
      on: (event, handler) => { handlers.set(event, handler); },
    });
    const handler = handlers.get('message:send');
    expect(handler).toBeDefined();
    const acknowledge = vi.fn();
    handler?.({ conversationId: 'conversation-1', content: 'Help me' }, acknowledge);

    await vi.waitFor(() => {
      expect(acknowledge).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.objectContaining({ content: 'Help me' }),
      }));
      expect(mocks.emit).toHaveBeenCalledWith('message:new', expect.objectContaining({
        id: 'bot-message',
        isBot: true,
        content: expect.stringContaining('Review report'),
      }));
    });
    expect(mocks.emit).not.toHaveBeenCalledWith('chat:error', expect.anything());
  });
});
