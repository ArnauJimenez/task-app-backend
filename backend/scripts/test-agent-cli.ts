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

    console.log(`\n========== LLM turn ${llmTurn} ==========`);
    console.log('History sent:');
    console.dir(messages, { depth: null });
    console.log('Available tools:');
    console.dir(tools, { depth: null });

    if (lastMessage.role === 'tool') {
      const toolResult = JSON.parse(lastMessage.content) as
        | { success: true; data: { id?: string } }
        | { success: false; error: string };
      const completion = toolResult.success
        ? {
            text: `Task created successfully. ID: ${toolResult.data.id ?? 'unavailable'}`,
          }
        : { text: `Tool failed: ${toolResult.error}` };
      console.log('Mock LLM response:');
      console.dir(completion, { depth: null });
      return completion;
    }

    const completion = {
      text: 'I will create the requested task.',
      toolCalls: [
        {
          id: `call-create-task-${llmTurn}`,
          name: 'create_task',
          args: {
            title: 'Verify Phase 2 of the AI Agent',
            description: 'Task created by scripts/test-agent-cli.ts using PostgreSQL.',
          },
        },
      ],
    };
    console.log('Mock LLM response:');
    console.dir(completion, { depth: null });
    return completion;
  },
};

async function main(): Promise<void> {
  const userId = process.env.AGENT_TEST_USER_ID?.trim() || DEFAULT_TEST_USER_ID;

  const prompt = 'Create a task to verify Phase 2 of the agent.';
  const baseToolExecutor = new ToolExecutor();
  const toolExecutor = {
    async execute(toolName: string, args: unknown, scopedUserId: string) {
      console.log('\n========== Tool execution ==========');
      console.log(`Name: ${toolName}`);
      console.log(`Authenticated user: ${scopedUserId}`);
      console.log('Arguments:');
      console.dir(args, { depth: null });
      const result = await baseToolExecutor.execute(toolName, args, scopedUserId);
      console.log('Result:');
      console.dir(result, { depth: null });
      return result;
    },
  };
  const agentService = new AgentService(toolExecutor, mockLLMAdapter);

  console.log('AgentService + ToolExecutor + PostgreSQL integration test');
  console.log(`Target user: ${userId}`);
  console.log(`Initial prompt: "${prompt}"`);
  try {
    const user = await taskService.getUserById(userId);
    if (!user) {
      throw new Error(
        `User '${userId}' does not exist in the configured database. Set AGENT_TEST_USER_ID to an existing user ID.`,
      );
    }

    const response = await agentService.run(userId, prompt);
    console.log('\n========== Final result ==========');
    console.log(response.message);
    console.log('\nExecuted tool trace:');
    console.dir(response.executedTools, { depth: null });

    const failedTool = response.executedTools.find((tool) => {
      return typeof tool.result === 'object'
        && tool.result !== null
        && 'success' in tool.result
        && tool.result.success === false;
    });
    if (failedTool) {
      throw new Error(`Tool '${failedTool.name}' could not complete the operation.`);
    }

    if (response.executedTools.length === 0) {
      throw new Error('The agent finished without executing a database operation.');
    }
  } finally {
    await taskService.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Could not run the agent:', error);
  process.exitCode = 1;
});
