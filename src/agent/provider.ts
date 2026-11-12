import { z } from 'zod';
import { agentTools } from './tools/definitions';

export interface FormattedAgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export function getFormattedAgentTools(): FormattedAgentTool[] {
  return Object.values(agentTools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: z.toJSONSchema(tool.schema, { io: 'input' }),
  }));
}
