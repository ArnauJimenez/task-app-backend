import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeDeleteTask } from './tools/delete-task.tool';

describe('delete_task tool', () => {
  const authenticatedUserId = 'eb0a2f04-fe23-4557-badd-b788d897d80b';
  const taskId = '550e8400-e29b-41d4-a716-446655440000';
  const deleteUserTask = vi.fn();
  const tasks = { deleteUserTask };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a task scoped to the authenticated owner', async () => {
    deleteUserTask.mockResolvedValueOnce(true);

    await expect(executeDeleteTask(
      { id: taskId },
      authenticatedUserId,
      tasks,
    )).resolves.toEqual({
      success: true,
      message: 'Task deleted successfully.',
      data: { id: taskId },
    });

    expect(deleteUserTask).toHaveBeenCalledWith(taskId, authenticatedUserId);
  });

  it('rejects deletion when the task does not belong to the authenticated user', async () => {
    deleteUserTask.mockResolvedValueOnce(false);

    await expect(executeDeleteTask(
      { id: taskId },
      '99999999-9999-9999-9999-999999999999',
      tasks,
    )).rejects.toThrow('Task not found or does not belong to the authenticated user.');

    expect(deleteUserTask).toHaveBeenCalledWith(
      taskId,
      '99999999-9999-9999-9999-999999999999',
    );
  });

  it.each([
    ['invalid UUID', { id: 'not-a-uuid' }],
    ['missing ID', {}],
    ['extra field', { id: taskId, userId: 'another-user' }],
  ])('rejects %s without calling the task service', async (_case, args) => {
    await expect(executeDeleteTask(args, authenticatedUserId, tasks))
      .rejects.toThrow();

    expect(deleteUserTask).not.toHaveBeenCalled();
  });
});
