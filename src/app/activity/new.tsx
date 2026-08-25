import { router, useLocalSearchParams } from 'expo-router';

import { FormScreen } from '@/components/FormScreen';
import { getDomainConfig } from '@/constants';
import { useActivities } from '@/features/activities/ActivitiesProvider';
import { createEmptyDraft, type ActivityDraft } from '@/features/activities/activityService';
import { ActivityForm } from '@/features/activities/components/ActivityForm';
import { notifyReminderOutcome } from '@/features/notifications/reminderFeedback';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useSettings } from '@/providers/SettingsProvider';
import type { ActivityDomain } from '@/types';

const VALID_DOMAINS: ActivityDomain[] = ['exercise', 'academic', 'hobby'];

/** El dominio llega por parámetro de ruta; si viene mal, se cae a Ejercicio. */
function parseDomain(value: string | undefined): ActivityDomain {
  return VALID_DOMAINS.find((domain) => domain === value) ?? 'exercise';
}

export default function NewActivityScreen() {
  const params = useLocalSearchParams<{ domain?: string }>();
  const domain = parseDomain(params.domain);
  const config = getDomainConfig(domain);

  const { currency } = useSettings();
  const { createActivity } = useActivities();

  const submit = useAsyncAction(async (draft: ActivityDraft) => {
    const result = await createActivity(domain, draft);
    router.back();
    notifyReminderOutcome(result.reminder);
    return result;
  });

  return (
    <FormScreen title={config.createLabel} accentColor={config.color}>
      <ActivityForm
        domain={domain}
        initialDraft={createEmptyDraft(currency)}
        submitLabel="Crear"
        onSubmit={(draft) => void submit.run(draft)}
        isSubmitting={submit.isRunning}
        error={submit.error}
        fieldErrors={submit.fieldErrors}
      />
    </FormScreen>
  );
}
