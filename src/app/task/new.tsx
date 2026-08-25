import { router } from 'expo-router';

import { FormScreen } from '@/components/FormScreen';
import { notifyReminderOutcome } from '@/features/notifications/reminderFeedback';
import { TaskForm } from '@/features/tasks/components/TaskForm';
import { useTasks } from '@/features/tasks/TasksProvider';
import { EMPTY_TASK_DRAFT, type TaskDraft } from '@/features/tasks/taskService';
import { useAsyncAction } from '@/hooks/useAsyncAction';

export default function NewTaskScreen() {
  const { createTask } = useTasks();

  const submit = useAsyncAction(async (draft: TaskDraft) => {
    const result = await createTask(draft);
    router.back();
    notifyReminderOutcome(result.reminder);
    return result;
  });

  return (
    <FormScreen title="Nueva tarea">
      <TaskForm
        initialDraft={EMPTY_TASK_DRAFT}
        submitLabel="Crear tarea"
        onSubmit={(draft) => void submit.run(draft)}
        isSubmitting={submit.isRunning}
        error={submit.error}
        fieldErrors={submit.fieldErrors}
      />
    </FormScreen>
  );
}
