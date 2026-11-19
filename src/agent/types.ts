export type AgentRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  thoughtSignature?: string;
}

export interface AgentMessage {
  role: AgentRole;
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
  name?: string;
}

export interface ExecutedToolRecord {
  name: string;
  args: unknown;
  result: unknown;
}

export interface AgentResponse {
  message: string;
  executedTools: ExecutedToolRecord[];
}

export interface LLMCompletionOptions {
  messages: AgentMessage[];
  tools: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

export interface LLMCompletionResult {
  text?: string;
  toolCalls?: ToolCall[];
}

export interface LLMClientAdapter {
  complete(options: LLMCompletionOptions): Promise<LLMCompletionResult>;
}
