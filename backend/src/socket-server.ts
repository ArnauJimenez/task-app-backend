import './instrument';
import 'dotenv/config';
import { createServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { app } from './app';
import { isCorsOriginAllowed } from './config/cors';
import { prisma } from './lib/prisma';
import { generateTaskBotReply } from './services/taskbot.service';

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
export const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
  httpServer,
  {
    cors: {
      origin: (origin, callback) => callback(null, isCorsOriginAllowed(origin)),
      credentials: true,
    },
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
    next(new Error('Authentication token is missing'));
    return;
  }

  let decoded: jwt.JwtPayload | string;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new Error('Invalid or expired token'));
      return;
    }
    console.error('Error validating socket token:', error);
    next(new Error('Could not validate the connection'));
    return;
  }
  if (typeof decoded === 'string') {
    next(new Error('Invalid or expired token'));
    return;
  }
  const userId = typeof decoded.userId === 'string' ? decoded.userId : decoded.id;
  if (typeof userId !== 'string') {
    next(new Error('Invalid or expired token'));
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      next(new Error('User not found'));
      return;
    }
    socket.data.userId = user.id;
    socket.data.userId = user.id;
    next();
  } catch (error) {
    console.error('Error authenticating socket:', error);
    next(new Error('Could not validate the connection'));
  }
});

io.on('connection', (socket) => {
  const { userId } = socket.data;
  socket.join(roomForUser(userId));
  console.info(`Chat client connected: ${socket.id}`);

  socket.on('conversation:join', (conversationId, acknowledge) => {
    if (typeof acknowledge !== 'function') {
      console.warn('Ignored conversation:join without an acknowledgement callback');
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
          acknowledge({ error: 'Conversation not found' });
          return;
        }
        await socket.join(roomForConversation(conversation.id));
        acknowledge({});
      } catch (error) {
        console.error('Error joining conversation:', error);
        acknowledge({ error: 'Could not open the conversation' });
      }
    })();
  });

  socket.on('message:send', (payload, acknowledge) => {
    if (typeof acknowledge !== 'function') {
      console.warn('Ignored message:send without an acknowledgement callback');
      return;
    }
    void (async () => {
      try {
        const conversationId = typeof payload?.conversationId === 'string' ? payload.conversationId : '';
        const content = typeof payload?.content === 'string' ? payload.content.trim() : '';
        if (!conversationId || !content || content.length > 2000) {
          acknowledge({ error: 'Message must contain between 1 and 2000 characters' });
          return;
        }

        const conversation = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [{ userOneId: userId }, { userTwoId: userId }],
          },
        });
        if (!conversation) {
          acknowledge({ error: 'Conversation not found' });
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
              const content = await generateTaskBotReply(conversationId, userId);
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
              console.error('Error generating TaskBot response:', error);
              io.to(roomForUser(userId)).emit('chat:error', {
                conversationId,
                message: 'The bot could not respond. Please try again later.',
              });
            }
          })();
        }
      } catch (error) {
        console.error('Error sending message:', error);
        acknowledge({ error: 'Could not send the message' });
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
        console.error('Error updating typing status:', error);
      }
    })();
  };

  socket.on('typing:start', forwardTyping(true));
  socket.on('typing:stop', forwardTyping(false));
  socket.on('disconnect', (reason) => {
    console.info(`Chat client disconnected: ${socket.id} (${reason})`);
  });
});

const port = Number(process.env.PORT || 3000);
httpServer.listen(port, '0.0.0.0', () => {
  console.info(`HTTP and Socket.IO server listening on port ${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    io.close(() => {
      void prisma.$disconnect().then(
        () => process.exit(0),
        (error: unknown) => {
          console.error('Error closing PostgreSQL connection:', error);
          process.exit(1);
        },
      );
    });
  });
}
