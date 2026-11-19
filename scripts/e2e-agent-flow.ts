import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

const apiBaseUrl = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const userId = process.env.AGENT_TEST_USER_ID || 'eb0a2f04-fe23-4557-badd-b788d897d80b';
const jwtSecret = process.env.JWT_SECRET;
const taskTitle = `Auditoría E2E de Seguridad ${randomUUID()}`;
const initialDescription = 'Verificar aislamiento de usuario y esquema Zod';
const updatedDescription = 'Completado con éxito en la prueba E2E';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ToolCall = {
  name: string;
  result: Record<string, unknown>;
};

type AgentResponse = {
  message: string;
  toolCalls: ToolCall[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getToolCalls(body: unknown): ToolCall[] {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    throw new Error('Agent API returned an unsuccessful or malformed response.');
  }

  const calls = body.data.executedTools;
  if (!Array.isArray(calls)) {
    throw new Error('Agent API response does not contain executed tool calls.');
  }

  return calls.flatMap((call): ToolCall[] => {
    if (!isRecord(call) || typeof call.name !== 'string' || !isRecord(call.result)) {
      return [];
    }
    return [{ name: call.name, result: call.result }];
  });
}

async function sendPrompt(prompt: string, token: string): Promise<AgentResponse> {
  console.log(`\n📤 Prompt: "${prompt}"`);
  const response = await fetch(`${apiBaseUrl}/api/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(90_000),
  });

  const body: unknown = await response.json().catch(() => null);
  console.log(`📥 HTTP status: ${response.status}`);
  console.log('Server response:');
  console.dir(body, { depth: null });
  if (response.status !== 200) {
    throw new Error(`Agent API request failed with HTTP ${response.status}.`);
  }

  if (!isRecord(body) || !isRecord(body.data) || typeof body.data.message !== 'string') {
    throw new Error('Agent API response does not contain a valid message.');
  }
  const toolCalls = getToolCalls(body);
  console.log(`Executed tools: ${toolCalls.map((call) => call.name).join(', ') || '(none)'}`);
  return { message: body.data.message, toolCalls };
}

function getTaskResult(
  toolCalls: ToolCall[],
  toolName: string,
): Record<string, unknown> {
  const call = toolCalls.find((entry) => entry.name === toolName);
  if (!call || call.result.success !== true || !isRecord(call.result.data)) {
    throw new Error(`Agent did not successfully execute ${toolName}.`);
  }
  return call.result.data;
}

function getTaskListResult(toolCalls: ToolCall[], toolName: string): unknown[] {
  const call = toolCalls.find((entry) => entry.name === toolName);
  if (!call || call.result.success !== true || !Array.isArray(call.result.data)) {
    throw new Error(`Agent did not successfully execute ${toolName}.`);
  }
  return call.result.data;
}

async function runE2EFlow(): Promise<void> {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured in the environment or .env file.');
  }

  const token = jwt.sign({ userId }, jwtSecret, { expiresIn: '1h' });
  console.log('🚀 Starting end-to-end agent flow.');
  console.log(`API: ${apiBaseUrl}/api/agent/chat`);
  console.log(`Test task title: ${taskTitle}`);

  console.log('\n--- Phase 1: Create task ---');
  console.log('⏳ Esperando 5 segundos para evitar el Rate Limit de Gemini...');
  await sleep(5_000);
  const createResponse = await sendPrompt(
    `Crea una tarea urgente llamada "${taskTitle}" con la descripción "${initialDescription}".`,
    token,
  );
  const createdTask = getTaskResult(createResponse.toolCalls, 'create_task');
  if (
    typeof createdTask.id !== 'string'
    || createdTask.title !== taskTitle
    || createdTask.description !== initialDescription
    || createdTask.userId !== userId
  ) {
    throw new Error('Created task did not match the requested title, description, or user.');
  }
  const taskId = createdTask.id;

  console.log('\n--- Phase 2: List task ---');
  console.log('⏳ Esperando 5 segundos para evitar el Rate Limit de Gemini...');
  await sleep(5_000);
  const listResponse = await sendPrompt(
    `Lista mis tareas pendientes e incluye la tarea "${taskTitle}".`,
    token,
  );
  const listedTasks = getTaskListResult(listResponse.toolCalls, 'get_tasks');
  if (!listedTasks.some((task) => isRecord(task) && task.id === taskId)) {
    throw new Error('The newly created task was not returned by get_tasks.');
  }

  console.log('\n--- Phase 3: Update task ---');
  console.log('⏳ Esperando 5 segundos para evitar el Rate Limit de Gemini...');
  await sleep(5_000);
  const updateResponse = await sendPrompt(
    `Marca la tarea con ID ${taskId} como completada y cambia su descripción a "${updatedDescription}".`,
    token,
  );
  const updateCall = updateResponse.toolCalls.find(
    (call) => call.name === 'update_task' || call.name === 'update_task_status',
  );
  if (!updateCall || updateCall.result.success !== true || !isRecord(updateCall.result.data)) {
    throw new Error('Agent did not successfully execute a task update tool.');
  }
  const updatedTask = updateCall.result.data;
  if (
    updatedTask.id !== taskId
    || updatedTask.completed !== true
    || updatedTask.description !== updatedDescription
    || updatedTask.userId !== userId
  ) {
    throw new Error('Task status, description, or user scope did not match the requested update.');
  }

  console.log('⏳ Esperando 5 segundos para evitar el Rate Limit de Gemini...');
  await sleep(5_000);
  console.log('\n--- Phase 4: Delete task ---');
  const deleteResponse = await sendPrompt(
    `Elimina la tarea "${taskTitle}" con ID ${taskId}.`,
    token,
  );
  const deletedTask = getTaskResult(deleteResponse.toolCalls, 'delete_task');
  if (
    deletedTask.id !== taskId
    || !/delete|removed|eliminad|borrad/i.test(deleteResponse.message)
  ) {
    throw new Error('Agent did not confirm deletion of the E2E task.');
  }

  console.log('\n✅ E2E flow completed: create → read → update → delete.');
}

async function main(): Promise<void> {
  let exitCode = 0;
  try {
    await runE2EFlow();
  } catch (error: unknown) {
    console.error('❌ E2E agent flow failed:', error);
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
}

void main();
