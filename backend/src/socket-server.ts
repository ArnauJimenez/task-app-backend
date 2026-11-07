import './instrument.js';
import { createServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { app } from './app';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';
import { generateGeminiReply } from './services/gemini.service';

interface SocketData {
  userId: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  senderId: string | null;
  isBot: boolean;
  createdAt: string;
}

interface MessageAck {
  message?: ChatMessage;
  error?: string;
}

interface ClientToServerEvents {
  'conversation:join': (conversationId: string, acknowledge: (result: { error?: string }) => void) => void;
  'message:send': (
    payload: { conversationId: string; content: string },
    acknowledge: (result: MessageAck) => void,
  ) => void;
  'typing:start': (payload: { conversationId: string }) => void;
  'typing:stop': (payload: { conversationId: string }) => void;
}

interface ServerToClientEvents {
  'message:new': (message: ChatMessage) => void;
  'conversation:updated': (conversationId: string) => void;
  'typing:update': (payload: { conversationId: string; userId: string; isTyping: boolean }) => void;
  'chat:error': (payload: { conversationId: string; message: string }) => void;
}

const httpServer = createServer(app);
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
  httpServer,
  {
    cors: { origin: allowedOrigins, credentials: true },
  },
);

const jwtSecret = process.env.JWT_SECRET || 'secreto_super_seguro';
const roomForUser = (userId: string) => `user:${userId}`;
const roomForConversation = (conversationId: string) => `conversation:${conversationId}`;

function toChatMessage(message: {
  id: string;
  conversationId: string;
  content: string;
  senderId: string | null;
  isBot: boolean;
  createdAt: Date;
}): ChatMessage {
  return { ...message, createdAt: message.createdAt.toISOString() };
}

io.use(async (socket, next) => {
  const token: unknown = socket.handshake.auth.token;
  if (typeof token !== 'string') {
    next(new Error('Falta el token de autenticación'));
    return;
  }

  let decoded: jwt.JwtPayload | string;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new Error('Token inválido o caducado'));
      return;
    }
    logger.error({ err: error }, 'Failed to validate Socket.IO token');
    next(new Error('No se pudo validar la conexión'));
    return;
  }
  if (typeof decoded === 'string') {
    next(new Error('Token inválido o caducado'));
    return;
  }
  const userId = typeof decoded.userId === 'string' ? decoded.userId : decoded.id;
  if (typeof userId !== 'string') {
    next(new Error('Token inválido o caducado'));
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      next(new Error('Usuario no encontrado'));
      return;
    }
    socket.data.userId = user.id;
    socket.data.userId = user.id;
    next();
  } catch (error) {
    logger.error({ err: error }, 'Failed to authenticate Socket.IO connection');
    next(new Error('No se pudo validar la conexión'));
  }
});

io.on('connection', (socket) => {
  const { userId } = socket.data;
  const socketLogger = logger.child({ socketId: socket.id, userId });
  socket.join(roomForUser(userId));
  socketLogger.info('Chat client connected');

  socket.on('conversation:join', (conversationId, acknowledge) => {
    if (typeof acknowledge !== 'function') {
      socketLogger.warn('Ignored conversation:join without acknowledgement callback');
      return;
    }
    void (async () => {
      try {
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [{ userOneId: userId }, { userTwoId: userId }],
          },
          select: { id: true },
        });
        if (!conversation) {
          acknowledge({ error: 'Conversación no encontrada' });
          return;
        }
        await socket.join(roomForConversation(conversation.id));
        acknowledge({});
      } catch (error) {
        socketLogger.error({ err: error, conversationId }, 'Failed to join conversation');
        acknowledge({ error: 'No se pudo abrir la conversación' });
      }
    })();
  });

  socket.on('message:send', (payload, acknowledge) => {
    if (typeof acknowledge !== 'function') {
      socketLogger.warn('Ignored message:send without acknowledgement callback');
      return;
    }
    void (async () => {
      try {
        const conversationId = typeof payload?.conversationId === 'string' ? payload.conversationId : '';
        const content = typeof payload?.content === 'string' ? payload.content.trim() : '';
        if (!conversationId || !content || content.length > 2000) {
          acknowledge({ error: 'El mensaje debe tener entre 1 y 2000 caracteres' });
          return;
        }

        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [{ userOneId: userId }, { userTwoId: userId }],
          },
        });
        if (!conversation) {
          acknowledge({ error: 'Conversación no encontrada' });
          return;
        }
        if (conversation.isBot && !process.env.GEMINI_API_KEY) {
          acknowledge({ error: 'El bot no está configurado: falta GEMINI_API_KEY en el backend' });
          return;
        }

        const savedMessage = await prisma.$transaction(async (transaction) => {
          const message = await transaction.message.create({
            data: { conversationId, content, senderId: userId },
          });
          await transaction.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });
          return message;
        });
        const message = toChatMessage(savedMessage);
        io.to(roomForConversation(conversationId)).emit('message:new', message);
        acknowledge({ message });

        const userRooms = [roomForUser(conversation.userOneId), roomForUser(conversation.userTwoId)];
        io.to(userRooms).emit('conversation:updated', conversationId);

        if (conversation.isBot) {
          void (async () => {
            try {
              const content = await generateGeminiReply(conversationId);
              const botMessage = await prisma.$transaction(async (transaction) => {
                const created = await transaction.message.create({
                  data: { conversationId, content, isBot: true },
                });
                await transaction.conversation.update({
                  where: { id: conversationId },
                  data: { updatedAt: new Date() },
                });
                return created;
              });
              io.to(roomForConversation(conversationId)).emit('message:new', toChatMessage(botMessage));
              io.to(roomForUser(userId)).emit('conversation:updated', conversationId);
            } catch (error) {
              socketLogger.error({ err: error, conversationId }, 'Failed to generate Gemini reply');
              io.to(roomForUser(userId)).emit('chat:error', {
                conversationId,
                message: 'El bot no pudo responder. Inténtalo de nuevo más tarde.',
              });
            }
          })();
        }
      } catch (error) {
        socketLogger.error({ err: error }, 'Failed to send chat message');
        acknowledge({ error: 'No se pudo enviar el mensaje' });
      }
    })();
  });

  const forwardTyping = (isTyping: boolean) => (payload: { conversationId: string }) => {
    void (async () => {
      try {
        const conversation = await prisma.conversation.findFirst({
          where: {
            id: payload?.conversationId,
            isBot: false,
            OR: [{ userOneId: userId }, { userTwoId: userId }],
          },
          select: { id: true },
        });
        if (conversation) {
          socket.to(roomForConversation(conversation.id)).emit('typing:update', {
            conversationId: conversation.id,
            userId,
            isTyping,
          });
        }
      } catch (error) {
        socketLogger.error({ err: error }, 'Failed to update typing status');
      }
    })();
  };

  socket.on('typing:start', forwardTyping(true));
  socket.on('typing:stop', forwardTyping(false));
  socket.on('disconnect', (reason) => {
    socketLogger.info({ reason }, 'Chat client disconnected');
  });
});

const port = Number(process.env.PORT || 4000);
httpServer.listen(port, '0.0.0.0', () => {
  logger.info({ port }, 'HTTP and Socket.IO server listening');
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    io.close(() => {
      void prisma.$disconnect().then(
        () => process.exit(0),
        (error: unknown) => {
          logger.error({ err: error }, 'Failed to disconnect from PostgreSQL');
          process.exit(1);
        },
      );
    });
  });
}
