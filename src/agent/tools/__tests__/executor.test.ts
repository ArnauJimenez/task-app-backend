import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../config/logger';
import { prisma } from '../../../lib/prisma';
import { taskService } from '../../../services/task.service';
import { ToolExecutor } from '../executor';

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    task: {
      create: vi.fn(),
    },
  },
}));

const mockTaskService = {
  deleteUserTask: vi.fn<typeof taskService.deleteUserTask>(),
  getUserTasks: vi.fn<typeof taskService.getUserTasks>(),
  updateUserTask: vi.fn<typeof taskService.updateUserTask>(),
} satisfies Pick<
  typeof taskService,
  'deleteUserTask' | 'getUserTasks' | 'updateUserTask'
>;

describe('ToolExecutor (Unit Tests)', () => {
  let toolExecutor: ToolExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.task.create).mockReset();
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
    vi.mocked(prisma.task.create).mockResolvedValueOnce(mockCreatedTask);

    const result = await toolExecutor.execute(
      'create_task',
      { title: 'Test Task', description: 'Una descripción de prueba' },
      'user-123',
    );

    expect(result).toEqual({
      success: true,
      message: 'Task created successfully.',
      data: mockCreatedTask,
    });
    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        title: 'Test Task',
        description: 'Una descripción de prueba',
        userId: 'user-123',
      },
    });
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
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('rejects invalid create-task arguments without calling Prisma', async () => {
    const emptyTitle = await toolExecutor.execute(
      'create_task',
      { title: '' },
      'user-123',
    );
    const tooLongTitle = await toolExecutor.execute(
      'create_task',
      { title: 'x'.repeat(256) },
      'user-123',
    );
    const unexpectedField = await toolExecutor.execute(
      'create_task',
      { title: 'Valid title', userId: 'another-user' },
      'user-123',
    );

    expect(emptyTitle.success).toBe(false);
    expect(tooLongTitle.success).toBe(false);
    expect(unexpectedField.success).toBe(false);
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('accepts title lengths at both schema boundaries', async () => {
    const createdTask = {
      id: 'task-1',
      title: 'x',
      description: null,
      completed: false,
      userId: 'user-123',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    vi.mocked(prisma.task.create).mockResolvedValue(createdTask);

    const minLengthResult = await toolExecutor.execute(
      'create_task',
      { title: 'x' },
      'user-123',
    );
    const maxLengthResult = await toolExecutor.execute(
      'create_task',
      { title: 'x'.repeat(255) },
      'user-123',
    );

    expect(minLengthResult.success).toBe(true);
    expect(maxLengthResult.success).toBe(true);
    expect(prisma.task.create).toHaveBeenNthCalledWith(1, {
      data: { title: 'x', userId: 'user-123' },
    });
    expect(prisma.task.create).toHaveBeenNthCalledWith(2, {
      data: { title: 'x'.repeat(255), userId: 'user-123' },
    });
  });

  it('scopes task listing to the authenticated user', async () => {
    mockTaskService.getUserTasks.mockResolvedValueOnce([]);

    const result = await toolExecutor.execute('get_tasks', {}, 'user-123');

    expect(result).toEqual({ success: true, data: [] });
    expect(mockTaskService.getUserTasks).toHaveBeenCalledWith('user-123');
  });

  it('updates task status and description for the authenticated user', async () => {
    const updatedTask = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Review Docker architecture',
      description: 'Review completed successfully',
      completed: true,
      userId: 'user-123',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    mockTaskService.updateUserTask.mockResolvedValueOnce(updatedTask);

    const result = await toolExecutor.execute(
      'update_task_status',
      {
        taskId: updatedTask.id,
        status: 'COMPLETED',
        description: updatedTask.description,
      },
      'user-123',
    );

    expect(result).toEqual({ success: true, data: updatedTask });
    expect(mockTaskService.updateUserTask).toHaveBeenCalledWith(
      updatedTask.id,
      'user-123',
      { completed: true, description: updatedTask.description },
    );
  });

  it('updates task fields through update_task within the authenticated user scope', async () => {
    const updatedTask = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Updated Docker architecture',
      description: 'Updated task description',
      completed: true,
      userId: 'user-123',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    mockTaskService.updateUserTask.mockResolvedValueOnce(updatedTask);

    const result = await toolExecutor.execute(
      'update_task',
      {
        id: updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        completed: updatedTask.completed,
      },
      'user-123',
    );

    expect(result).toEqual({
      success: true,
      message: `Task updated successfully: "${updatedTask.title}"`,
      data: updatedTask,
    });
    expect(mockTaskService.updateUserTask).toHaveBeenCalledWith(
      updatedTask.id,
      'user-123',
      {
        title: updatedTask.title,
        description: updatedTask.description,
        completed: updatedTask.completed,
      },
    );
  });

  it('rejects empty or extra update_task fields without updating the task', async () => {
    const emptyUpdate = await toolExecutor.execute(
      'update_task',
      { id: '550e8400-e29b-41d4-a716-446655440000' },
      'user-123',
    );
    const extraField = await toolExecutor.execute(
      'update_task',
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Updated title',
        userId: 'another-user',
      },
      'user-123',
    );

    expect(emptyUpdate).toEqual({
      success: false,
      error: expect.stringContaining('al menos un campo'),
    });
    expect(extraField.success).toBe(false);
    expect(mockTaskService.updateUserTask).not.toHaveBeenCalled();
  });

  it('returns not found when update_task targets another user’s task', async () => {
    mockTaskService.updateUserTask.mockResolvedValueOnce(null);

    const result = await toolExecutor.execute(
      'update_task',
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        completed: true,
      },
      'user-123',
    );

    expect(result).toEqual({ success: false, error: 'Task not found' });
    expect(mockTaskService.updateUserTask).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      'user-123',
      { completed: true },
    );
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
