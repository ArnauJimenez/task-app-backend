import 'dotenv/config';
import jwt from 'jsonwebtoken';

const apiBaseUrl = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const userId = process.env.AGENT_TEST_USER_ID || 'eb0a2f04-fe23-4557-badd-b788d897d80b';
const jwtSecret = process.env.JWT_SECRET;
const taskId = '4e03601e-e6d3-4fe3-9921-5ae89b24dee0';
const description = 'Revisión de puertos y Docker finalizada con éxito';
const prompt = `Marca la tarea con ID ${taskId} como completada y cambia su descripción a "${description}".`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function main(): Promise<void> {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured in the environment or .env file.');
  }

  const token = jwt.sign({ userId }, jwtSecret, { expiresIn: '1h' });
  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.set('Authorization', ['Bearer', token].join(' '));
  console.log(`Sending update-task agent request to ${apiBaseUrl}/api/agent/chat`);
  console.log(`Authenticated user ID: ${userId}`);
  console.log(`Prompt: "${prompt}"`);

  const response = await fetch(`${apiBaseUrl}/api/agent/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(75_000),
  });

  const body: unknown = await response.json().catch(() => null);
  console.log(`HTTP status: ${response.status}`);
  console.log('Server response:');
  console.dir(body, { depth: null });

  if (!response.ok) {
    throw new Error(`Agent API request failed with HTTP ${response.status}.`);
  }
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    throw new Error('Agent API returned an unsuccessful or malformed response.');
  }

  const executedTools = body.data.executedTools;
  const updateCall = Array.isArray(executedTools)
    ? executedTools.find((tool) => isRecord(tool) && tool.name === 'update_task_status')
    : undefined;
  const result = isRecord(updateCall) && isRecord(updateCall.result)
    ? updateCall.result
    : undefined;
  const updatedTask = result && isRecord(result.data) ? result.data : undefined;

  if (
    result?.success !== true
    || updatedTask?.id !== taskId
    || updatedTask.completed !== true
    || updatedTask.description !== description
    || updatedTask.userId !== userId
  ) {
    throw new Error('Agent did not update the task status and description as requested.');
  }

  console.log('Task status and description verified successfully.');
}

main().catch((error: unknown) => {
  console.error('Update-task agent test failed:', error);
  process.exitCode = 1;
});
