import { router, useLocalSearchParams } from 'expo-router';

import { FormScreen } from '@/components/FormScreen';
import { getFinanceKindConfig } from '@/constants';
import { FinanceForm } from '@/features/finance/components/FinanceForm';
import { useFinance } from '@/features/finance/FinanceProvider';
import { createEmptyDraft, type FinanceDraft } from '@/features/finance/financeService';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useSettings } from '@/providers/SettingsProvider';
import type { FinanceKind } from '@/types';

const VALID_KINDS: FinanceKind[] = ['income', 'expense', 'debt', 'saving'];

/** El tipo llega por parámetro de ruta; si viene mal, se cae a un gasto. */
function parseKind(value: string | undefined): FinanceKind {
  return VALID_KINDS.find((kind) => kind === value) ?? 'expense';
}

export default function NewFinanceEntryScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind = parseKind(params.kind);

  const { currency } = useSettings();
  const { createEntry } = useFinance();

  const submit = useAsyncAction(async (draft: FinanceDraft) => {
    const created = await createEntry(draft);
    router.back();
    return created;
  });

  return (
    <FormScreen title={getFinanceKindConfig(kind).createLabel}>
      <FinanceForm
        initialDraft={createEmptyDraft(kind)}
        currency={currency}
        submitLabel="Guardar"
        onSubmit={(draft) => void submit.run(draft)}
        isSubmitting={submit.isRunning}
        error={submit.error}
        fieldErrors={submit.fieldErrors}
      />
    </FormScreen>
  );
}
