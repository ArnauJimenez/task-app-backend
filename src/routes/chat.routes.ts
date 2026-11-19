import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

const conversationInclude = {
  userOne: { select: { id: true, name: true, email: true } },
  userTwo: { select: { id: true, name: true, email: true } },
  messages: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { content: true, createdAt: true },
  },
} satisfies Prisma.ConversationInclude;

type ConversationWithSummary = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

function toConversationSummary(conversation: ConversationWithSummary, userId: string) {
  const otherUser = conversation.isBot
    ? null
    : conversation.userOneId === userId
      ? conversation.userTwo
      : conversation.userOne;
  const lastMessage = conversation.messages[0];

  return {
    id: conversation.id,
    isBot: conversation.isBot,
    otherUser,
    lastMessage: lastMessage
      ? { content: lastMessage.content, createdAt: lastMessage.createdAt.toISOString() }
      : null,
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

function requireUserId(req: Request, res: Response): string | undefined {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Usuario no autenticado' });
    return undefined;
  }
  return userId;
}

router.use(verifyToken);

router.get('/users', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (search.length < 2) {
    res.status(400).json({ message: 'La búsqueda debe contener al menos 2 caracteres' });
    return;
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        email: { contains: search, mode: 'insensitive' },
      },
      select: { id: true, name: true, email: true },
      orderBy: { email: 'asc' },
      take: 15,
    });
    res.json({ users });
  } catch (error) {
    console.error('Error al buscar usuarios para chat:', error);
    res.status(500).json({ message: 'No se pudieron buscar usuarios' });
  }
});

router.get('/conversations', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        isBot: false,
        OR: [{ userOneId: userId }, { userTwoId: userId }],
      },
      include: conversationInclude,
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ conversations: conversations.map((item) => toConversationSummary(item, userId)) });
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({ message: 'No se pudieron cargar las conversaciones' });
  }
});

router.get('/conversations/bot', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const conversation = await prisma.conversation.upsert({
      where: { userOneId_userTwoId_isBot: { userOneId: userId, userTwoId: userId, isBot: true } },
      create: { userOneId: userId, userTwoId: userId, isBot: true },
      update: {},
      include: conversationInclude,
    });
    res.json({ conversation: toConversationSummary(conversation, userId) });
  } catch (error) {
    console.error('Error al abrir el chat con el bot:', error);
    res.status(500).json({ message: 'No se pudo abrir el chat con el bot' });
  }
});

router.post('/conversations', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const recipientId = typeof req.body?.userId === 'string' ? req.body.userId : '';
  if (!recipientId || recipientId === userId) {
    res.status(400).json({ message: 'Selecciona otro usuario para iniciar la conversación' });
    return;
  }

  try {
    const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
    if (!recipient) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    const [userOneId, userTwoId] = [userId, recipientId].sort();
    const conversation = await prisma.conversation.upsert({
      where: { userOneId_userTwoId_isBot: { userOneId, userTwoId, isBot: false } },
      create: { userOneId, userTwoId },
      update: {},
      include: conversationInclude,
    });
    res.json({ conversation: toConversationSummary(conversation, userId) });
  } catch (error) {
    console.error('Error al iniciar conversación:', error);
    res.status(500).json({ message: 'No se pudo iniciar la conversación' });
  }
});

router.get('/conversations/:conversationId/messages', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: req.params.conversationId,
        OR: [{ userOneId: userId }, { userTwoId: userId }],
      },
      select: { id: true },
    });
    if (!conversation) {
      res.status(404).json({ message: 'Conversación no encontrada' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { sender: { select: { id: true, name: true, email: true } } },
    });
    res.json({
      messages: messages.reverse().map((message) => ({
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        senderId: message.senderId,
        sender: message.sender,
        isBot: message.isBot,
        createdAt: message.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ message: 'No se pudieron cargar los mensajes' });
  }
});

export default router;
