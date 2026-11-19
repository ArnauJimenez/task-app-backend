import 'dotenv/config';
import jwt from 'jsonwebtoken';

const apiBaseUrl = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const userId = process.env.AGENT_TEST_USER_ID || 'eb0a2f04-fe23-4557-badd-b788d897d80b';
const jwtSecret = process.env.JWT_SECRET;
const prompt = 'Lista mis tareas pendientes.';

async function main(): Promise<void> {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured in the environment or .env file.');
  }

  const token = jwt.sign({ userId }, jwtSecret, { expiresIn: '1h' });
  console.log(`Sending read-only agent request to ${apiBaseUrl}/api/agent/chat`);
  console.log(`Authenticated user ID: ${userId}`);
  console.log(`Prompt: "${prompt}"`);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(75_000),
    });
  } catch (error: unknown) {
    throw new Error(
      `Could not connect to the backend at ${apiBaseUrl}. Start it with npm run dev.`,
      { cause: error },
    );
  }

  const body: unknown = await response.json().catch(() => null);
  console.log(`HTTP status: ${response.status}`);
  console.log('Server response:');
  console.dir(body, { depth: null });

  if (!response.ok) {
    throw new Error(`Agent API request failed with HTTP ${response.status}.`);
  }
}

main().catch((error: unknown) => {
  console.error('API chat test failed:', error);
  process.exitCode = 1;
});
