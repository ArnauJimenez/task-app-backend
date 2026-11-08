import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../config/logger';
import { taskService } from '../../../services/task.service';
import { ToolExecutor } from '../executor';

const mockTaskService = {
  createTask: vi.fn<typeof taskService.createTask>(),
  deleteUserTask: vi.fn<typeof taskService.deleteUserTask>(),
  getUserTasks: vi.fn<typeof taskService.getUserTasks>(),
  updateUserTask: vi.fn<typeof taskService.updateUserTask>(),
} satisfies Pick<
  typeof taskService,
  'createTask' | 'deleteUserTask' | 'getUserTasks' | 'updateUserTask'
>;

describe('ToolExecutor (Unit Tests)', () => {
  let toolExecutor: ToolExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    toolExecutor = new ToolExecutor(mockTaskService);
  });

  it('returns an error when the tool does not exist', async () => {
    const result = await toolExecutor.execute('invalid_tool', {}, 'user-123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Unknown tool name');
    }
  });

  it('creates a task for the authenticated user', async () => {
    const mockCreatedTask = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Una descripción de prueba',
      completed: false,
      userId: 'user-123',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      user: { email: 'user@example.com' },
    };
    mockTaskService.createTask.mockResolvedValueOnce(mockCreatedTask);

    const result = await toolExecutor.execute(
      'create_task',
      { title: 'Test Task', description: 'Una descripción de prueba' },
      'user-123',
    );

    expect(result).toEqual({ success: true, data: mockCreatedTask });
    expect(mockTaskService.createTask).toHaveBeenCalledWith(
      'Test Task',
      'Una descripción de prueba',
      'user-123',
    );
  });

  it('returns a Zod validation error when required fields are missing', async () => {
    const result = await toolExecutor.execute(
      'create_task',
      { description: 'Falta el título' },
      'user-123',
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid input');
      expect(result.error).toContain('title');
    }
    expect(mockTaskService.createTask).not.toHaveBeenCalled();
  });

  it('scopes task listing to the authenticated user', async () => {
    mockTaskService.getUserTasks.mockResolvedValueOnce([]);

    const result = await toolExecutor.execute('get_tasks', {}, 'user-123');

    expect(result).toEqual({ success: true, data: [] });
    expect(mockTaskService.getUserTasks).toHaveBeenCalledWith('user-123');
  });

  it('returns a safe error if a task service operation fails', async () => {
    const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    mockTaskService.getUserTasks.mockRejectedValueOnce(
      new Error('database connection details'),
    );

    const result = await toolExecutor.execute('get_tasks', {}, 'user-123');

    expect(result).toEqual({
      success: false,
      error: 'Tool execution failed; please try again',
    });
    expect(errorLog).toHaveBeenCalledOnce();
  });
});
