import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { ErrorState } from '@/components/ui';
import { FinanceForm } from '@/features/finance/components/FinanceForm';
import { useFinance } from '@/features/finance/FinanceProvider';
import { entryToDraft, type FinanceDraft } from '@/features/finance/financeService';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useSettings } from '@/providers/SettingsProvider';

export default function EditFinanceEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currency } = useSettings();
  const { getById, updateEntry, deleteEntry } = useFinance();
  const entry = getById(id);

  const submit = useAsyncAction(async (draft: FinanceDraft) => {
    const updated = await updateEntry(id, draft);
    router.back();
    return updated;
  });

  const confirmDelete = () => {
    if (!entry) return;

    Alert.alert(`Eliminar ${entry.name}`, 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteEntry(id);
            router.back();
          })();
        },
      },
    ]);
  };

  if (!entry) {
    return (
      <FormScreen title="Movimiento">
        <ErrorState message="Este movimiento ya no existe." onRetry={() => router.back()} />
      </FormScreen>
    );
  }

  return (
    <FormScreen title={entry.name}>
      <FinanceForm
        initialDraft={entryToDraft(entry)}
        currency={currency}
        submitLabel="Guardar cambios"
        onSubmit={(draft) => void submit.run(draft)}
        onDelete={confirmDelete}
        // El tipo no se puede cambiar al editar: cambiaría el significado de
        // los montos ya guardados.
        lockKind
        isSubmitting={submit.isRunning}
        error={submit.error}
        fieldErrors={submit.fieldErrors}
      />
    </FormScreen>
  );
}
