import 'dotenv/config';
import { AgentService } from '../src/agent/agent.service';
import { ToolExecutor } from '../src/agent/tools/executor';
import type { LLMClientAdapter } from '../src/agent/types';
import { taskService } from '../src/services/task.service';

const DEFAULT_TEST_USER_ID = 'cmpshtii40000g20wg2n43bas';
let llmTurn = 0;

const mockLLMAdapter: LLMClientAdapter = {
  async complete({ messages, tools }) {
    llmTurn += 1;
    const lastMessage = messages[messages.length - 1];

    console.log(`\n========== LLM turno ${llmTurn} ==========`);
    console.log('Historial enviado:');
    console.dir(messages, { depth: null });
    console.log('Herramientas disponibles:');
    console.dir(tools, { depth: null });

    if (lastMessage.role === 'tool') {
      const toolResult = JSON.parse(lastMessage.content) as
        | { success: true; data: { id?: string } }
        | { success: false; error: string };
      const completion = toolResult.success
        ? {
            text: `Tarea creada correctamente. ID: ${toolResult.data.id ?? 'no disponible'}`,
          }
        : { text: `La herramienta falló: ${toolResult.error}` };
      console.log('Respuesta simulada del LLM:');
      console.dir(completion, { depth: null });
      return completion;
    }

    const completion = {
      text: 'Voy a crear la tarea solicitada.',
      toolCalls: [
        {
          id: `call-create-task-${llmTurn}`,
          name: 'create_task',
          args: {
            title: 'Verificar Fase 2 del Agente de IA',
            description: 'Tarea creada por scripts/test-agent-cli.ts usando PostgreSQL.',
          },
        },
      ],
    };
    console.log('Respuesta simulada del LLM:');
    console.dir(completion, { depth: null });
    return completion;
  },
};

async function main(): Promise<void> {
  const userId = process.env.AGENT_TEST_USER_ID?.trim() || DEFAULT_TEST_USER_ID;

  const prompt = 'Crea una tarea para verificar la Fase 2 del agente.';
  const baseToolExecutor = new ToolExecutor();
  const toolExecutor = {
    async execute(toolName: string, args: unknown, scopedUserId: string) {
      console.log('\n========== Ejecución de herramienta ==========');
      console.log(`Nombre: ${toolName}`);
      console.log(`Usuario autenticado: ${scopedUserId}`);
      console.log('Argumentos:');
      console.dir(args, { depth: null });
      const result = await baseToolExecutor.execute(toolName, args, scopedUserId);
      console.log('Resultado:');
      console.dir(result, { depth: null });
      return result;
    },
  };
  const agentService = new AgentService(toolExecutor, mockLLMAdapter);

  console.log('Prueba de integración AgentService + ToolExecutor + PostgreSQL');
  console.log(`Usuario objetivo: ${userId}`);
  console.log(`Prompt inicial: "${prompt}"`);
  try {
    const user = await taskService.getUserById(userId);
    if (!user) {
      throw new Error(
        `El usuario '${userId}' no existe en la base configurada. Define AGENT_TEST_USER_ID con el ID de un usuario existente.`,
      );
    }

    const response = await agentService.run(userId, prompt);
    console.log('\n========== Resultado final ==========');
    console.log(response.message);
    console.log('\nTraza de herramientas ejecutadas:');
    console.dir(response.executedTools, { depth: null });

    const failedTool = response.executedTools.find((tool) => {
      return typeof tool.result === 'object'
        && tool.result !== null
        && 'success' in tool.result
        && tool.result.success === false;
    });
    if (failedTool) {
      throw new Error(`La herramienta '${failedTool.name}' no pudo completar la operación.`);
    }

    if (response.executedTools.length === 0) {
      throw new Error('El agente terminó sin ejecutar una operación en la base de datos.');
    }
  } finally {
    await taskService.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('No se pudo ejecutar el agente:', error);
  process.exitCode = 1;
});
