"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
require("dotenv/config");
const node_http_1 = require("node:http");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socket_io_1 = require("socket.io");
const app_1 = require("./app");
const prisma_1 = require("./lib/prisma");
const gemini_service_1 = require("./services/gemini.service");
const httpServer = (0, node_http_1.createServer)(app_1.app);
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
exports.io = new socket_io_1.Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
});
const jwtSecret = process.env.JWT_SECRET || 'secreto_super_seguro';
const roomForUser = (userId) => `user:${userId}`;
const roomForConversation = (conversationId) => `conversation:${conversationId}`;
function toChatMessage(message) {
    return { ...message, createdAt: message.createdAt.toISOString() };
}
exports.io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (typeof token !== 'string') {
        next(new Error('Falta el token de autenticación'));
        return;
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
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
        const user = await prisma_1.prisma.user.findUnique({
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
    }
    catch (error) {
        console.error('Error al autenticar el socket:', error);
        next(new Error('No se pudo validar la conexión'));
    }
});
exports.io.on('connection', (socket) => {
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
                const conversation = await prisma_1.prisma.conversation.findFirst({
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
            }
            catch (error) {
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
                const conversation = await prisma_1.prisma.conversation.findFirst({
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
                const savedMessage = await prisma_1.prisma.$transaction(async (transaction) => {
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
                exports.io.to(roomForConversation(conversationId)).emit('message:new', message);
                acknowledge({ message });
                const userRooms = [roomForUser(conversation.userOneId), roomForUser(conversation.userTwoId)];
                exports.io.to(userRooms).emit('conversation:updated', conversationId);
                if (conversation.isBot) {
                    void (async () => {
                        try {
                            const content = await (0, gemini_service_1.generateGeminiReply)(conversationId);
                            const botMessage = await prisma_1.prisma.$transaction(async (transaction) => {
                                const created = await transaction.message.create({
                                    data: { conversationId, content, isBot: true },
                                });
                                await transaction.conversation.update({
                                    where: { id: conversationId },
                                    data: { updatedAt: new Date() },
                                });
                                return created;
                            });
                            exports.io.to(roomForConversation(conversationId)).emit('message:new', toChatMessage(botMessage));
                            exports.io.to(roomForUser(userId)).emit('conversation:updated', conversationId);
                        }
                        catch (error) {
                            console.error('Error al generar respuesta de Gemini:', error);
                            exports.io.to(roomForUser(userId)).emit('chat:error', {
                                conversationId,
                                message: 'El bot no pudo responder. Inténtalo de nuevo más tarde.',
                            });
                        }
                    })();
                }
            }
            catch (error) {
                console.error('Error al enviar mensaje:', error);
                acknowledge({ error: 'No se pudo enviar el mensaje' });
            }
        })();
    });
    const forwardTyping = (isTyping) => (payload) => {
        void (async () => {
            try {
                const conversation = await prisma_1.prisma.conversation.findFirst({
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
            }
            catch (error) {
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
for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        exports.io.close(() => {
            void prisma_1.prisma.$disconnect().then(() => process.exit(0), (error) => {
                console.error('Error al cerrar la conexión con PostgreSQL:', error);
                process.exit(1);
            });
        });
    });
}
