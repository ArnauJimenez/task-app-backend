import { type FormEvent, useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, LoaderCircle, Send, Sparkles, UserRound } from "lucide-react";
import { AgentApiError, sendAgentMessage, type ExecutedAgentTool } from "../services/agent.service.js";

interface AgentChatBoxProps {
  token: string;
  onUnauthorized: () => void;
}

interface ChatEntry {
  id: number;
  role: "user" | "assistant";
  content: string;
  executedTools?: ExecutedAgentTool[];
}

function describeToolResult(result: unknown): string {
  if (typeof result === "string") return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return "Result unavailable";
  }
}

export function AgentChatBox({ token, onUnauthorized }: AgentChatBoxProps) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedPrompt = prompt.trim();
    if (!submittedPrompt || isLoading) return;

    setError(null);
    setPrompt("");
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", content: submittedPrompt },
    ]);
    setIsLoading(true);

    try {
      const response = await sendAgentMessage(submittedPrompt, token);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: response.message,
          executedTools: response.executedTools,
        },
      ]);
    } catch (requestError: unknown) {
      if (requestError instanceof AgentApiError && requestError.status === 401) {
        onUnauthorized();
      }
      setError(requestError instanceof Error
        ? requestError.message
        : "Could not send the message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      aria-label="Chat with the agent"
      className="mx-auto flex h-[min(72vh,720px)] min-h-[420px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-xl"
    >
      <header className="flex items-center gap-3 border-b border-slate-700 px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
          <Sparkles size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold text-slate-100">Task assistant</h2>
          <p className="text-xs text-slate-400">Ask it to view or manage your tasks</p>
        </div>
      </header>

      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6"
      >
        {messages.length === 0 && (
          <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
            <Bot size={32} className="mb-3 text-indigo-300" aria-hidden="true" />
            <p className="font-medium text-slate-200">How can I help you?</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              For example: “Show my pending tasks” or “Create a task to call the team”.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <article
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              message.role === "user"
                ? "bg-slate-600 text-slate-100"
                : "bg-indigo-500/15 text-indigo-300"
            }`}>
              {message.role === "user"
                ? <UserRound size={16} aria-hidden="true" />
                : <Bot size={16} aria-hidden="true" />}
            </span>
            <div className={`max-w-[85%] min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              message.role === "user"
                ? "bg-indigo-600 text-white"
                : "border border-slate-700 bg-slate-900/70 text-slate-100"
            }`}>
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              {message.role === "assistant" && Boolean(message.executedTools?.length) && (
                <details className="mt-3 border-t border-slate-700 pt-2">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200">
                    <ChevronDown size={14} aria-hidden="true" />
                    Actions performed ({message.executedTools?.length})
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {message.executedTools?.map((tool, index) => (
                      <li key={`${tool.name}-${index}`} className="rounded-lg bg-slate-800 p-2">
                        <p className="font-mono text-xs text-indigo-200">{tool.name}</p>
                        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] text-slate-400">
                          {describeToolResult(tool.result)}
                        </pre>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </article>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-sm text-slate-400" role="status">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            </span>
            The agent is thinking…
          </div>
        )}
        <div ref={historyEndRef} />
      </div>

      {error && (
        <p role="alert" className="mx-4 mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-3 border-t border-slate-700 p-3 sm:p-4">
        <label className="sr-only" htmlFor="agent-prompt">Message for the agent</label>
        <textarea
          id="agent-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Type a message…"
          rows={1}
          maxLength={4000}
          disabled={isLoading}
          className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading
            ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
            : <Send size={18} aria-hidden="true" />}
        </button>
      </form>
    </section>
  );
}
