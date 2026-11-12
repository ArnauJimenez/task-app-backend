import { describe, expect, it } from 'vitest';
import { getFormattedAgentTools } from '../provider';

describe('getFormattedAgentTools', () => {
  it('translates the Zod definitions to provider-compatible JSON schemas', () => {
    const tools = getFormattedAgentTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      'get_tasks',
      'create_task',
      'update_task_status',
      'update_task',
      'delete_task',
    ]);

    const getTasks = tools.find((tool) => tool.name === 'get_tasks');
    expect(getTasks?.parameters).toMatchObject({
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['PENDING', 'COMPLETED'] },
        search: { type: 'string' },
        limit: { type: 'integer' },
      },
    });
    expect(getTasks?.parameters.required).toBeUndefined();

    const createTask = tools.find((tool) => tool.name === 'create_task');
    expect(createTask?.parameters.required).toEqual(['title']);
    expect(createTask?.parameters).toMatchObject({
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string' },
      },
    });
    expect(createTask?.parameters.additionalProperties).toBe(false);

    const updateTaskStatus = tools.find((tool) => tool.name === 'update_task_status');
    expect(updateTaskStatus?.parameters.properties).toMatchObject({
      taskId: { type: 'string' },
      status: { type: 'string', enum: ['PENDING', 'COMPLETED'] },
      description: { type: 'string' },
    });
    expect(updateTaskStatus?.parameters.required).toContain('status');

    const updateTask = tools.find((tool) => tool.name === 'update_task');
    expect(updateTask?.parameters).toMatchObject({
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string' },
        completed: { type: 'boolean' },
      },
      required: ['id'],
      additionalProperties: false,
    });

    const deleteTask = tools.find((tool) => tool.name === 'delete_task');
    expect(deleteTask?.parameters).toMatchObject({
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
      required: ['id'],
      additionalProperties: false,
    });
  });
});
