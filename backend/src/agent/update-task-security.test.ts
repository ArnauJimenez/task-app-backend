import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeUpdateTask } from './tools/update-task.tool';

describe('Task isolation in update_task', () => {
  const ownerUserId = 'eb0a2f04-fe23-4557-badd-b788d897d80b';
  const attackerUserId = '99999999-9999-9999-9999-999999999999';
  const taskId = '550e8400-e29b-41d4-a716-446655440000';
  const updateUserTask = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    updateUserTask.mockResolvedValue(null);
  });

  it('does not update or expose a task when it is outside the authenticated user scope', async () => {
    const result = await executeUpdateTask(
      { id: taskId, completed: true },
      attackerUserId,
      { updateUserTask },
    );

    expect(updateUserTask).toHaveBeenCalledWith(
      taskId,
      attackerUserId,
      { completed: true },
    );
    expect(result).toEqual({ success: false, error: 'Task not found' });
  });
});
