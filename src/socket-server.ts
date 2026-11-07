import 'dotenv/config';
import { createServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { app } from './app';
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
    console.error('Error al validar el token del socket:', error);
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
    console.error('Error al autenticar el socket:', error);
    next(new Error('No se pudo validar la conexión'));
  }
});

io.on('connection', (socket) => {
  const { userId } = socket.data;
  socket.join(roomForUser(userId));
  console.info(`Cliente de chat conectado: ${socket.id}`);

  socket.on('conversation:join', (conversationId, acknowledge) => {
    if (typeof acknowledge !== 'function') {
      console.warn('Se ignoró conversation:join sin callback de confirmación');
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
        console.error('Error al unirse a la conversación:', error);
        acknowledge({ error: 'No se pudo abrir la conversación' });
      }
    })();
  });

  socket.on('message:send', (payload, acknowledge) => {
    if (typeof acknowledge !== 'function') {
      console.warn('Se ignoró message:send sin callback de confirmación');
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
              console.error('Error al generar respuesta de Gemini:', error);
              io.to(roomForUser(userId)).emit('chat:error', {
                conversationId,
                message: 'El bot no pudo responder. Inténtalo de nuevo más tarde.',
              });
            }
          })();
        }
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
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
        console.error('Error al actualizar el estado de escritura:', error);
      }
    })();
  };

  socket.on('typing:start', forwardTyping(true));
  socket.on('typing:stop', forwardTyping(false));
  socket.on('disconnect', (reason) => {
    console.info(`Cliente de chat desconectado: ${socket.id} (${reason})`);
  });
});

const port = Number(process.env.PORT || 4000);
httpServer.listen(port, '0.0.0.0', () => {
  console.info(`Servidor HTTP y Socket.IO escuchando en el puerto ${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    io.close(() => {
      void prisma.$disconnect().then(
        () => process.exit(0),
        (error: unknown) => {
          console.error('Error al cerrar la conexión con PostgreSQL:', error);
          process.exit(1);
        },
      );
    });
  });
}
