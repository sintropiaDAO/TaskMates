import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { createTaskRecord, updateTaskRecord, completeTaskById } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/types';

/**
 * Single mounting point for the task creation/edit modal.
 *
 * Every screen (Dashboard, Tag page, Tag detail modal, Related Actions) must
 * mount the modal through this host so the modal always gets the exact same
 * wiring — creation, editing, completion, subtasks and pre-selected tags.
 * Mounting CreateTaskModal directly caused features (e.g. "mark as completed")
 * to silently disappear on some screens. Guarded by
 * tests/architecture/no-duplicate-create-modals.test.ts.
 */
export interface CreateTaskModalHostProps {
  open: boolean;
  onClose: () => void;
  /** Task being edited, if any. */
  editTask?: Task | null;
  /** Parent task id when creating a subtask. */
  parentTaskId?: string;
  /** Tags pre-checked on the form (e.g. the current community). */
  preSelectedTags?: string[];
  /** Called after a successful create/update so the screen can refresh. */
  onSaved?: (task: Task) => void;
  /** Called when completing the task on creation wins a lucky star. */
  onWonStar?: () => void;
}

export function CreateTaskModalHost({
  open,
  onClose,
  editTask,
  parentTaskId,
  preSelectedTags,
  onSaved,
  onWonStar,
}: CreateTaskModalHostProps) {
  const { user } = useAuth();

  return (
    <CreateTaskModal
      open={open}
      onClose={onClose}
      editTask={editTask}
      parentTaskId={parentTaskId}
      preSelectedTags={preSelectedTags}
      onSubmit={async (title, description, taskType, tagIds, deadline, imageUrl, priority, location, parentId) => {
        if (editTask) {
          const ok = await updateTaskRecord(
            user?.id,
            editTask.id,
            {
              title,
              description,
              task_type: taskType,
              deadline: deadline || null,
              image_url: imageUrl || null,
              priority: priority || null,
              location: location || null,
            } as Partial<Task>,
            tagIds,
          );
          if (!ok) return null;
          const updated = {
            ...editTask,
            title,
            description,
            task_type: taskType,
            deadline: deadline || null,
            image_url: imageUrl || null,
            priority: priority || null,
            location: location || null,
          } as Task;
          onSaved?.(updated);
          return updated;
        }

        const task = await createTaskRecord(user?.id, {
          title,
          description,
          taskType,
          tagIds,
          deadline,
          imageUrl,
          priority,
          location,
          parentTaskId: parentId ?? parentTaskId,
        });
        if (task) onSaved?.(task);
        return task;
      }}
      onComplete={async (taskId, proofUrl, proofType) => {
        const result = await completeTaskById(taskId, proofUrl, proofType, user?.id);
        if (result.wonStar) onWonStar?.();
        return result;
      }}
    />
  );
}
