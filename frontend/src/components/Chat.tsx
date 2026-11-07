import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, LoaderCircle, MessageCircle, Search, Send, Wifi, WifiOff } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { isAxiosError } from "axios";
import { api, apiOrigin } from "../services/api.js";

interface ChatUser {
  id: string;
  name: string | null;
  email: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  senderId: string | null;
  sender?: ChatUser | null;
  isBot: boolean;
  createdAt: string;
}

interface ChatConversation {
  id: string;
  isBot: boolean;
  otherUser: ChatUser | null;
  lastMessage: { content: string; createdAt: string } | null;
  updatedAt: string;
}

interface MessageAck {
  message?: ChatMessage;
  error?: string;
}

interface ClientToServerEvents {
  "conversation:join": (conversationId: string, acknowledge: (result: { error?: string }) => void) => void;
  "message:send": (
    payload: { conversationId: string; content: string },
    acknowledge: (result: MessageAck) => void,
  ) => void;
  "typing:start": (payload: { conversationId: string }) => void;
  "typing:stop": (payload: { conversationId: string }) => void;
}

interface ServerToClientEvents {
  "message:new": (message: ChatMessage) => void;
  "conversation:updated": (conversationId: string) => void;
  "typing:update": (payload: { conversationId: string; userId: string; isTyping: boolean }) => void;
  "chat:error": (payload: { conversationId: string; message: string }) => void;
}

interface ChatProps {
  token: string;
  onUnauthorized: () => void;
}

function getTokenUserId(token: string): string | null {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return null;
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64)) as { userId?: unknown; id?: unknown };
    if (typeof payload.userId === "string") return payload.userId;
    return typeof payload.id === "string" ? payload.id : null;
  } catch {
    return null;
  }
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Chat({ token, onUnauthorized }: ChatProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [draft, setDraft] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const activeConversationId = useRef<string | null>(selectedConversationId);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUserId = useMemo(() => getTokenUserId(token), [token]);
  const selectedConversation = conversations.find((item) => item.id === selectedConversationId) ?? null;

  useEffect(() => {
    activeConversationId.current = selectedConversationId;
  }, [selectedConversationId]);

  const handleRequestError = useCallback((requestError: unknown, fallback: string) => {
    if (isAxiosError(requestError) && requestError.response?.status === 401) {
      onUnauthorized();
      return;
    }
    setError(isAxiosError<{ message?: string }>(requestError)
      ? requestError.response?.data?.message ?? fallback
      : fallback);
  }, [onUnauthorized]);

  const loadConversations = useCallback(async () => {
    try {
      const [listResponse, botResponse] = await Promise.all([
        api.get<{ conversations: ChatConversation[] }>("/chat/conversations"),
        api.get<{ conversation: ChatConversation }>("/chat/conversations/bot"),
      ]);
      setConversations([botResponse.data.conversation, ...listResponse.data.conversations]);
    } catch (requestError) {
      handleRequestError(requestError, "No se pudieron cargar las conversaciones");
    }
  }, [handleRequestError]);

  const selectConversation = (conversationId: string) => {
    setMessages([]);
    setIsLoadingMessages(true);
    setError(null);
    setSelectedConversationId(conversationId);
  };

  useEffect(() => {
    void Promise.resolve().then(loadConversations);
  }, [loadConversations]);

  useEffect(() => {
    const connection = io(apiOrigin, {
      auth: { token },
      reconnection: true,
    }) as Socket<ServerToClientEvents, ClientToServerEvents>;
    socketRef.current = connection;

    const joinActiveConversation = () => {
      setIsConnected(true);
      const conversationId = activeConversationId.current;
      if (conversationId) {
        connection.emit("conversation:join", conversationId, (result) => {
          if (result.error) setError(result.error);
        });
      }
    };
    const onMessage = (message: ChatMessage) => {
      if (message.conversationId === activeConversationId.current) {
        setMessages((current) => current.some((item) => item.id === message.id)
          ? current
          : [...current, message]);
      }
      void loadConversations();
    };
    const onConversationUpdated = () => {
      void loadConversations();
    };
    const onTyping = (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (payload.conversationId !== activeConversationId.current || payload.userId === currentUserId) return;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      setTypingUserId(payload.isTyping ? payload.userId : null);
      if (payload.isTyping) {
        typingTimer.current = setTimeout(() => setTypingUserId(null), 2500);
      }
    };
    const onChatError = (payload: { conversationId: string; message: string }) => {
      if (payload.conversationId === activeConversationId.current) setError(payload.message);
    };
    const onDisconnect = () => setIsConnected(false);
    const onConnectError = () => {
      setIsConnected(false);
      setError("No se pudo conectar al chat en tiempo real");
    };

    connection.on("connect", joinActiveConversation);
    connection.on("disconnect", onDisconnect);
    connection.on("connect_error", onConnectError);
    connection.on("message:new", onMessage);
    connection.on("conversation:updated", onConversationUpdated);
    connection.on("typing:update", onTyping);
    connection.on("chat:error", onChatError);
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (draftTypingTimer.current) clearTimeout(draftTypingTimer.current);
      connection.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, loadConversations, token]);

  useEffect(() => {
    if (!selectedConversationId) return;
    let cancelled = false;
    void api.get<{ messages: ChatMessage[] }>(`/chat/conversations/${selectedConversationId}/messages`)
      .then((response) => {
        if (!cancelled) {
          setMessages((current) => {
            const existingIds = new Set(response.data.messages.map((message) => message.id));
            return [
              ...response.data.messages,
              ...current.filter((message) => !existingIds.has(message.id)),
            ];
          });
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) handleRequestError(requestError, "No se pudieron cargar los mensajes");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMessages(false);
      });

    const connection = socketRef.current;
    if (connection?.connected) {
      connection.emit("conversation:join", selectedConversationId, (result) => {
        if (result.error) setError(result.error);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [handleRequestError, selectedConversationId]);

  useEffect(() => {
    const trimmedSearch = search.trim();
    if (trimmedSearch.length < 2) return;

    let active = true;
    const timer = setTimeout(() => {
      void api.get<{ users: ChatUser[] }>("/chat/users", { params: { search: trimmedSearch } })
        .then((response) => {
          if (active) setUsers(response.data.users);
        })
        .catch((requestError: unknown) => {
          if (active) handleRequestError(requestError, "No se pudieron buscar usuarios");
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [handleRequestError, search]);

  const openConversation = async (user: ChatUser) => {
    try {
      const response = await api.post<{ conversation: ChatConversation }>("/chat/conversations", {
        userId: user.id,
      });
      setConversations((current) => [
        response.data.conversation,
        ...current.filter((item) => item.id !== response.data.conversation.id),
      ]);
      setMessages([]);
      setIsLoadingMessages(true);
      setError(null);
      setSelectedConversationId(response.data.conversation.id);
      setSearch("");
      setUsers([]);
      setError(null);
    } catch (requestError) {
      handleRequestError(requestError, "No se pudo abrir la conversación");
    }
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    const conversationId = selectedConversationId;
    const connection = socketRef.current;
    if (!content || !conversationId || !connection?.connected || isSending) return;

    setIsSending(true);
    setError(null);
    connection.emit("message:send", { conversationId, content }, (result) => {
      setIsSending(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.message) {
        const sentMessage = result.message;
        setMessages((current) => current.some((item) => item.id === sentMessage.id)
          ? current
          : [...current, sentMessage]);
        setDraft("");
        connection.emit("typing:stop", { conversationId });
      }
    });
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    const connection = socketRef.current;
    if (!selectedConversationId || !connection?.connected) return;

    connection.emit("typing:start", { conversationId: selectedConversationId });
    if (draftTypingTimer.current) clearTimeout(draftTypingTimer.current);
    draftTypingTimer.current = setTimeout(() => {
      connection.emit("typing:stop", { conversationId: selectedConversationId });
    }, 900);
  };

  const conversationTitle = (conversation: ChatConversation) =>
    conversation.isBot ? "TaskBot" : conversation.otherUser?.name || conversation.otherUser?.email || "Chat";

  return (
    <section className="mt-4 grid min-h-[min(70vh,680px)] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-xl md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="flex min-h-56 flex-col border-b border-slate-700 md:border-b-0 md:border-r">
        <div className="border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-100">Conversaciones</h2>
            <span className={`flex items-center gap-1 text-xs ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isConnected ? "Conectado" : "Conectando"}
            </span>
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              aria-label="Buscar usuarios por email"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (event.target.value.trim().length < 2) setUsers([]);
              }}
              placeholder="Buscar por email"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {users.length > 0 && (
            <div className="mb-3">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Personas</p>
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => void openConversation(user)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-700"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-600/30 text-indigo-300">
                    <MessageCircle size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{user.name || user.email}</span>
                    <span className="block truncate text-xs text-slate-400">{user.email}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {search.trim().length >= 2 && users.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">No se encontraron usuarios.</p>
          )}

          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => selectConversation(conversation.id)}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                selectedConversationId === conversation.id ? "bg-indigo-600/25" : "hover:bg-slate-700"
              }`}
            >
              <span className={`grid size-10 shrink-0 place-items-center rounded-full ${
                conversation.isBot ? "bg-indigo-600 text-white" : "bg-slate-700 text-indigo-300"
              }`}>
                {conversation.isBot ? <Bot size={19} /> : <MessageCircle size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-100">{conversationTitle(conversation)}</span>
                <span className="block truncate text-xs text-slate-400">
                  {conversation.lastMessage?.content ?? (conversation.isBot ? "Pregunta al asistente" : "Sin mensajes todavía")}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex min-h-[420px] min-w-0 flex-col">
        {selectedConversation ? (
          <>
            <header className="flex items-center gap-3 border-b border-slate-700 px-5 py-4">
              <span className={`grid size-10 place-items-center rounded-full ${
                selectedConversation.isBot ? "bg-indigo-600 text-white" : "bg-slate-700 text-indigo-300"
              }`}>
                {selectedConversation.isBot ? <Bot size={19} /> : <MessageCircle size={18} />}
              </span>
              <div>
                <h3 className="font-semibold text-slate-100">{conversationTitle(selectedConversation)}</h3>
                <p className="text-xs text-slate-400">
                  {selectedConversation.isBot
                    ? "Gemini procesa los mensajes de esta conversación"
                    : selectedConversation.otherUser?.email}
                </p>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
              {isLoadingMessages ? (
                <div className="flex justify-center py-8 text-slate-400">
                  <LoaderCircle className="animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">Aún no hay mensajes. ¡Saluda!</p>
              ) : messages.map((message) => {
                const ownMessage = message.senderId === currentUserId && !message.isBot;
                return (
                  <div key={message.id} className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}>
                    <article className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      ownMessage
                        ? "rounded-br-sm bg-indigo-600 text-white"
                        : "rounded-bl-sm bg-slate-700 text-slate-100"
                    }`}>
                      {message.isBot && <p className="mb-1 text-xs font-semibold text-indigo-300">TaskBot</p>}
                      {!ownMessage && !message.isBot && message.sender?.name && (
                        <p className="mb-1 text-xs font-semibold text-slate-300">{message.sender.name}</p>
                      )}
                      <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                      <time className={`mt-1 block text-right text-[10px] ${ownMessage ? "text-indigo-200" : "text-slate-400"}`}>
                        {formatTime(message.createdAt)}
                      </time>
                    </article>
                  </div>
                );
              })}
              {typingUserId && <p className="text-xs italic text-slate-400">La otra persona está escribiendo...</p>}
            </div>

            {error && <p role="alert" className="px-4 pb-2 text-sm text-rose-300">{error}</p>}
            <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-700 p-3 sm:p-4">
              <textarea
                aria-label="Escribe un mensaje"
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                maxLength={2000}
                rows={1}
                placeholder="Escribe un mensaje..."
                className="max-h-32 min-h-11 flex-1 resize-y rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!draft.trim() || !isConnected || isSending}
                aria-label="Enviar mensaje"
                className="grid size-11 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={17} />
              </button>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-content-center p-8 text-center">
            <MessageCircle className="mx-auto mb-3 text-indigo-400" size={34} />
            <h3 className="font-semibold text-slate-100">Tus mensajes</h3>
            <p className="mt-1 text-sm text-slate-400">Elige una conversación o busca a alguien por su email.</p>
            {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
