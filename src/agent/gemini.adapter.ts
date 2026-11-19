import { z } from 'zod';
import { logger } from '../config/logger';
import type {
  AgentMessage,
  LLMClientAdapter,
  LLMCompletionOptions,
  LLMCompletionResult,
} from './types';

const geminiResponseSchema = z.object({
  error: z.object({ message: z.string().optional() }).passthrough().optional(),
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({
        text: z.string().optional(),
        thoughtSignature: z.string().optional(),
        functionCall: z.object({
          name: z.string(),
          args: z.record(z.string(), z.unknown()).optional(),
        }).optional(),
      }).passthrough()),
    }).optional(),
  }).passthrough()).optional(),
}).passthrough();

interface GeminiPart {
  text?: string;
  thoughtSignature?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

type GeminiResponse = z.infer<typeof geminiResponseSchema>;

const MAX_TRANSIENT_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

class GeminiApiError extends Error {
  constructor(
    readonly status: number,
    readonly providerError: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

function parseToolResult(content: string): Record<string, unknown> {
  try {
    const result: unknown = JSON.parse(content);
    if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
      return result as Record<string, unknown>;
    }
    return { result };
  } catch {
    return { result: content };
  }
}

function toGeminiContents(messages: AgentMessage[]): {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }>;
} {
  const systemMessages = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content);
  const contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }> = [];

  for (const message of messages) {
    if (message.role === 'system') continue;

    if (message.role === 'tool') {
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: message.name ?? 'unknown_tool',
            response: parseToolResult(message.content),
          },
        }],
      });
      continue;
    }

    if (message.role === 'assistant' && message.toolCalls?.length) {
      const parts: GeminiPart[] = [];
      if (message.content) parts.push({ text: message.content });
      for (const call of message.toolCalls) {
        parts.push({
          functionCall: { name: call.name, args: call.args },
          ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}),
        });
      }
      contents.push({ role: 'model', parts });
      continue;
    }

    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    });
  }

  return {
    ...(systemMessages.length > 0
      ? { systemInstruction: { parts: [{ text: systemMessages.join('\n\n') }] } }
      : {}),
    contents,
  };
}

function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const type = schema.type;
  if (typeof type === 'string') {
    result.type = type.toUpperCase();
  }
  if (typeof schema.description === 'string') result.description = schema.description;
  if (Array.isArray(schema.enum)) result.enum = schema.enum;
  if (Array.isArray(schema.required)) result.required = schema.required;
  if (typeof schema.items === 'object' && schema.items !== null) {
    result.items = toGeminiSchema(schema.items as Record<string, unknown>);
  }
  if (typeof schema.properties === 'object' && schema.properties !== null) {
    const properties = schema.properties as Record<string, unknown>;
    result.properties = Object.fromEntries(
      Object.entries(properties).map(([name, property]) => [
        name,
        toGeminiSchema(property as Record<string, unknown>),
      ]),
    );
  }
  return result;
}

export class GeminiLLMAdapter implements LLMClientAdapter {
  constructor(
    private readonly apiKey = process.env.GEMINI_API_KEY,
    private readonly model = process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    private readonly timeoutMs = getTimeoutMs(),
  ) {}

  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.completeAttempt(options);
      } catch (error: unknown) {
        if (!(error instanceof GeminiApiError)) throw error;

        const shouldRetry = RETRYABLE_STATUS_CODES.has(error.status)
          && attempt < MAX_TRANSIENT_RETRIES;
        const errorDetails = {
          err: error,
          model: this.model,
          status: error.status,
          providerError: error.providerError,
          attempt: attempt + 1,
          maxAttempts: MAX_TRANSIENT_RETRIES + 1,
        };

        if (!shouldRetry) {
          logger.error(errorDetails, 'Gemini API request failed');
          throw error;
        }

        const delayMs = 500 * (2 ** attempt);
        logger.warn({
          ...errorDetails,
          retryInMs: delayMs,
        }, 'Gemini API returned a transient error; retrying');
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  private async completeAttempt(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    if (!this.apiKey) {
      throw new Error('Agent LLM is not configured: GEMINI_API_KEY is missing.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();
    let response: Response;

    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            ...toGeminiContents(options.messages),
            tools: [{
              functionDeclarations: options.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                parameters: toGeminiSchema(tool.parameters),
              })),
            }],
            toolConfig: {
              functionCallingConfig: { mode: 'AUTO' },
            },
            generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
          }),
          signal: controller.signal,
        },
      );
    } catch (error: unknown) {
      clearTimeout(timeout);
      if (controller.signal.aborted) throw this.timeoutError(error, startedAt);
      const message = error instanceof Error ? error.message : String(error);
      logger.error({
        err: error,
        model: this.model,
        durationMs: Date.now() - startedAt,
      }, 'Gemini network request failed');
      throw new Error(`Gemini network request failed (model: ${this.model}): ${message}`, {
        cause: error,
      });
    }

    try {
      if (!response.ok) {
        const errorBody = await readGeminiResponse(response, this.model);
        const providerMessage = errorBody?.error?.message;
        const message =
          providerMessage
            ? `Gemini API returned HTTP ${response.status}: ${providerMessage}`
            : `Gemini API returned HTTP ${response.status}.`;
        throw new GeminiApiError(response.status, errorBody?.error, message);
      }

      const result = await readGeminiResponse(response, this.model);
      const parts = result.candidates?.[0]?.content?.parts ?? [];
      const text = parts
        .map((part) => part.text ?? '')
        .filter(Boolean)
        .join('\n')
        .trim();
      const toolCalls = parts.flatMap((part, index) => {
        if (!part.functionCall) return [];
        if (!part.functionCall.name.trim()) {
          logger.error({ model: this.model, partIndex: index }, 'Gemini returned a malformed function call');
          throw new Error(`Gemini returned a function call without a valid name (part ${index}).`);
        }

        const args = part.functionCall.args;
        return [{
          id: `gemini-call-${Date.now()}-${index}`,
          name: part.functionCall.name,
          args: args ?? {},
          ...(part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
        }];
      });

      if (!text && toolCalls.length === 0) {
        logger.error({
          model: this.model,
          durationMs: Date.now() - startedAt,
          candidateCount: result.candidates?.length ?? 0,
        }, 'Gemini response contained no text or function calls');
        throw new Error('Gemini API returned neither text nor tool calls.');
      }

      logger.debug({
        model: this.model,
        durationMs: Date.now() - startedAt,
        toolCallCount: toolCalls.length,
        hasText: Boolean(text),
      }, 'Gemini response parsed successfully');

      return {
        ...(text ? { text } : {}),
        ...(toolCalls.length > 0 ? { toolCalls } : {}),
      };
    } catch (error: unknown) {
      if (controller.signal.aborted) throw this.timeoutError(error, startedAt);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private timeoutError(cause: unknown, startedAt: number): Error {
    const durationMs = Date.now() - startedAt;
    logger.error({
      model: this.model,
      timeoutMs: this.timeoutMs,
      durationMs,
    }, 'Gemini request timed out');
    return new Error(`Gemini request timed out after ${this.timeoutMs}ms (model: ${this.model}).`, {
      cause,
    });
  }
}

function getTimeoutMs(): number {
  const configuredTimeout = process.env.GEMINI_TIMEOUT_MS;
  if (configuredTimeout === undefined) return 60_000;

  const timeoutMs = Number(configuredTimeout);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new Error('GEMINI_TIMEOUT_MS must be an integer between 1000 and 120000.');
  }
  return timeoutMs;
}

async function readGeminiResponse(response: Response, model: string): Promise<GeminiResponse> {
  let responseText: string;
  try {
    responseText = await response.text();
  } catch (error: unknown) {
    logger.error({ err: error, model, status: response.status }, 'Failed reading Gemini response body');
    throw new Error(`Failed to read Gemini response body (HTTP ${response.status}).`, { cause: error });
  }

  try {
    const payload: unknown = JSON.parse(responseText);
    const parsed = geminiResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }
    return parsed.data;
  } catch (error: unknown) {
    logger.error({
      err: error,
      model,
      status: response.status,
      responseLength: responseText.length,
    }, 'Failed parsing Gemini response JSON');
    throw new Error(`Failed to parse Gemini response JSON (HTTP ${response.status}).`, { cause: error });
  }
}
