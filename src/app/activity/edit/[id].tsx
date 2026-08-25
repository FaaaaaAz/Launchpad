import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { ErrorState, LoadingState } from '@/components/ui';
import { getDomainConfig } from '@/constants';
import { useActivities } from '@/features/activities/ActivitiesProvider';
import { activityToDraft, type ActivityDraft } from '@/features/activities/activityService';
import { ActivityForm } from '@/features/activities/components/ActivityForm';
import { notifyReminderOutcome } from '@/features/notifications/reminderFeedback';
import { hasReminder } from '@/features/notifications/reminderService';
import { useAsyncAction } from '@/hooks/useAsyncAction';

export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, updateActivity, deleteActivity } = useActivities();
  const activity = getById(id);

  const [initialDraft, setInitialDraft] = useState<ActivityDraft | null>(null);

  useEffect(() => {
    if (!activity) return;
    let active = true;

    void (async () => {
      const reminderEnabled = await hasReminder('payment', activity.id);
      if (active) setInitialDraft(activityToDraft(activity, reminderEnabled));
    })();

    return () => {
      active = false;
    };
    // Depende solo del identificador a propósito: reconstruir el borrador en
    // cada cambio de la actividad descartaría lo que el usuario está
    // escribiendo en ese momento.
  }, [activity?.id]);

  const submit = useAsyncAction(async (draft: ActivityDraft) => {
    if (!activity) return undefined;
    const result = await updateActivity(activity, draft);
    router.back();
    notifyReminderOutcome(result.reminder);
    return result;
  });

  const confirmDelete = () => {
    if (!activity) return;

    Alert.alert(
      `Eliminar ${activity.name}`,
      'Se borrarán también su imagen, sus pagos registrados y sus recordatorios.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await deleteActivity(activity);
              // Se vuelve dos pantallas: la de edición y el detalle, que ya
              // apunta a algo que dejó de existir.
              router.dismissTo('/');
            })();
          },
        },
      ],
    );
  };

  if (!activity) {
    return (
      <FormScreen title="Editar">
        <ErrorState message="Esta actividad ya no existe." onRetry={() => router.back()} />
      </FormScreen>
    );
  }

  const config = getDomainConfig(activity.domain);

  return (
    <FormScreen title={`Editar ${activity.name}`} accentColor={config.color}>
      {initialDraft ? (
        <ActivityForm
          domain={activity.domain}
          initialDraft={initialDraft}
          submitLabel="Guardar cambios"
          onSubmit={(draft) => void submit.run(draft)}
          onDelete={confirmDelete}
          isSubmitting={submit.isRunning}
          error={submit.error}
          fieldErrors={submit.fieldErrors}
        />
      ) : (
        <LoadingState />
      )}
    </FormScreen>
  );
}
