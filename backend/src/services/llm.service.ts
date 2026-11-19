import { logger } from '../config/logger';

export async function requestChatCompletion<T>(
  body: Record<string, unknown>,
  parse: (payload: unknown) => T | undefined,
): Promise<T | undefined> {
  const providers = [
    {
      name: 'primary',
      apiKey: process.env.PRIMARY_LLM_API_KEY?.trim() || process.env.LLM_API_KEY?.trim(),
      baseUrl: process.env.PRIMARY_LLM_BASE_URL?.trim() || process.env.LLM_BASE_URL?.trim() || 'https://api.deepseek.com/v1',
      model: process.env.PRIMARY_LLM_MODEL?.trim() || process.env.LLM_MODEL?.trim() || 'deepseek-chat',
    },
    {
      name: 'secondary',
      apiKey: process.env.SECONDARY_LLM_API_KEY?.trim(),
      baseUrl: process.env.SECONDARY_LLM_BASE_URL?.trim() || 'https://api.groq.com/openai/v1',
      model: process.env.SECONDARY_LLM_MODEL?.trim() || 'openai/gpt-oss-120b',
    },
  ].filter((provider) => provider.apiKey);

  if (!providers.length) {
    logger.warn({ reason: 'no_configured_providers' }, 'LLM unavailable');
    return undefined;
  }

  for (const provider of providers) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    let payload: unknown;
    try {
      const baseUrl = provider.baseUrl.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
        body: JSON.stringify({ ...body, model: provider.model }),
        signal: controller.signal,
      });
      if (!response.ok) {
        logger.warn({ provider: provider.name, reason: 'http_error', status: response.status }, 'LLM provider failed');
        continue;
      }

      payload = await response.json();
    } catch (error) {
      const reason = controller.signal.aborted
        ? 'timeout'
        : error instanceof SyntaxError ? 'invalid_response' : 'network_error';
      logger.warn({ provider: provider.name, reason }, 'LLM provider failed');
      continue;
    } finally {
      clearTimeout(timeout);
    }
    const result = parse(payload);
    if (result === undefined) {
      logger.warn({ provider: provider.name, reason: 'invalid_response' }, 'LLM provider failed');
      continue;
    }
    logger.info({ provider: provider.name }, 'LLM provider handled request');
    return result;
  }
  return undefined;
}
