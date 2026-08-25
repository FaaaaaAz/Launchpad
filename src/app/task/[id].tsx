import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { ErrorState, LoadingState } from '@/components/ui';
import { notifyReminderOutcome } from '@/features/notifications/reminderFeedback';
import { hasReminder } from '@/features/notifications/reminderService';
import { TaskForm } from '@/features/tasks/components/TaskForm';
import { useTasks } from '@/features/tasks/TasksProvider';
import { findTask, taskToDraft, type TaskDraft } from '@/features/tasks/taskService';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { toUserMessage } from '@/utils/errors';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateTask, deleteTask } = useTasks();

  const [initialDraft, setInitialDraft] = useState<TaskDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Se lee la tarea de la base en vez de tomarla de la lista en memoria para
  // que la pantalla funcione igual si se llega por enlace directo.
  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const task = await findTask(id);
        if (!active) return;

        if (!task) {
          setLoadError('Esta tarea ya no existe.');
          return;
        }

        setInitialDraft(taskToDraft(task, await hasReminder('task', task.id)));
      } catch (cause) {
        if (active) setLoadError(toUserMessage(cause, 'No se pudo abrir la tarea.'));
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const submit = useAsyncAction(async (draft: TaskDraft) => {
    const result = await updateTask(id, draft);
    router.back();
    notifyReminderOutcome(result.reminder);
    return result;
  });

  const confirmDelete = () => {
    Alert.alert('Eliminar tarea', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteTask(id);
            router.back();
          })();
        },
      },
    ]);
  };

  return (
    <FormScreen title="Editar tarea">
      {loadError ? (
        <ErrorState message={loadError} onRetry={() => router.back()} />
      ) : !initialDraft ? (
        <LoadingState />
      ) : (
        <TaskForm
          initialDraft={initialDraft}
          submitLabel="Guardar cambios"
          onSubmit={(draft) => void submit.run(draft)}
          onDelete={confirmDelete}
          isSubmitting={submit.isRunning}
          error={submit.error}
          fieldErrors={submit.fieldErrors}
        />
      )}
    </FormScreen>
  );
}
