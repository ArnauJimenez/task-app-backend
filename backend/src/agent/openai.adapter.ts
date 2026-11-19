import { z } from 'zod';
import { requestChatCompletion } from '../services/llm.service';
import type { AgentMessage, LLMClientAdapter, LLMCompletionOptions, LLMCompletionResult, ToolCall } from './types';

const responseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string().nullable().optional(),
      tool_calls: z.array(z.object({
        id: z.string().trim().min(1),
        type: z.literal('function'),
        function: z.object({
          name: z.string().trim().min(1),
          arguments: z.string(),
        }),
      })).optional(),
    }),
  })).min(1),
});

function toProviderMessage(message: AgentMessage): Record<string, unknown> {
  if (message.role === 'tool') {
    if (!message.toolCallId) throw new Error('A tool response must have a tool call ID.');
    return { role: 'tool', tool_call_id: message.toolCallId, content: message.content };
  }
  if (message.role === 'assistant' && message.toolCalls?.length) {
    return {
      role: 'assistant',
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: JSON.stringify(call.args) },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

function parseCompletion(payload: unknown): LLMCompletionResult | undefined {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) return undefined;
  const message = parsed.data.choices[0].message;
  const text = message.content?.trim();
  const toolCalls: ToolCall[] = [];
  const ids = new Set<string>();

  for (const call of message.tool_calls ?? []) {
    let args: unknown;
    try {
      args = JSON.parse(call.function.arguments);
    } catch (error) {
      if (error instanceof SyntaxError) return undefined;
      throw error;
    }
    const parsedArgs = z.record(z.string(), z.unknown()).safeParse(args);
    if (!parsedArgs.success || ids.has(call.id)) return undefined;
    ids.add(call.id);
    toolCalls.push({ id: call.id, name: call.function.name, args: parsedArgs.data });
  }

  if (!text && !toolCalls.length) return undefined;
  return {
    ...(text ? { text } : {}),
    ...(toolCalls.length ? { toolCalls } : {}),
  };
}

export class OpenAILLMAdapter implements LLMClientAdapter {
  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const completion = await requestChatCompletion({
      messages: options.messages.map(toProviderMessage),
      tools: options.tools.map((tool) => ({ type: 'function', function: tool })),
      tool_choice: 'auto',
      max_tokens: 1024,
      temperature: 0.3,
    }, parseCompletion);

    if (!completion) throw new Error('The agent could not reach an available LLM provider.');
    return completion;
  }
}
