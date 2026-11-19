import { isAxiosError } from "axios";
import { api } from "./api.js";

export interface ExecutedAgentTool {
  name: string;
  args: unknown;
  result: unknown;
}

export interface AgentReply {
  message: string;
  executedTools: ExecutedAgentTool[];
}

interface AgentApiEnvelope {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class AgentApiError extends Error {
  readonly status?: number;

  constructor(
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = "AgentApiError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAgentReply(payload: unknown): AgentReply {
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) {
    const error = isRecord(payload) && typeof payload.error === "string"
      ? payload.error
      : "The server returned an invalid response.";
    throw new AgentApiError(error);
  }

  const { message, executedTools } = payload.data;
  if (typeof message !== "string" || !Array.isArray(executedTools)) {
    throw new AgentApiError("The server returned an invalid response.");
  }

  const validTools = executedTools.every((tool) => (
    isRecord(tool)
    && typeof tool.name === "string"
    && "args" in tool
    && "result" in tool
  ));
  if (!validTools) {
    throw new AgentApiError("The server returned an invalid tool trace.");
  }

  return { message, executedTools: executedTools as ExecutedAgentTool[] };
}

export async function sendAgentMessage(prompt: string, token: string): Promise<AgentReply> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new AgentApiError("Enter a message before sending.");
  }
  if (!token.trim()) {
    throw new AgentApiError("Your session is invalid. Please sign in again.", 401);
  }

  try {
    const response = await api.post<AgentApiEnvelope>(
      "/agent/chat",
      { prompt: trimmedPrompt },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return parseAgentReply(response.data);
  } catch (error: unknown) {
    if (error instanceof AgentApiError) throw error;

    if (isAxiosError<AgentApiEnvelope>(error)) {
      if (error.response?.status === 401) {
        throw new AgentApiError("Your session has expired. Please sign in again.", 401);
      }

      const message = error.response?.data?.error
        ?? (error.response
          ? "Could not complete the agent request."
          : "Could not connect to the server. Check that the backend is available.");
      throw new AgentApiError(message, error.response?.status);
    }

    throw new AgentApiError("An unexpected error occurred while contacting the agent.");
  }
}
