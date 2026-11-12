import { prisma } from '../lib/prisma';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export async function generateGeminiReply(conversationId: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('El bot no está configurado: falta GEMINI_API_KEY en el backend');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { content: true, isBot: true },
  });
  const contents = messages.reverse().map((message) => ({
    role: message.isBot ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API devolvió el estado ${response.status}`);
  }

  const result = await response.json() as GeminiResponse;
  const text = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini devolvió una respuesta vacía');
  }
  return text;
}
