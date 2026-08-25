import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ChipSelector,
  DateTimeField,
  FormSection,
  SwitchField,
  TextField,
} from '@/components/form';
import type { ChipOption } from '@/components/form';
import { Button, InlineError } from '@/components/ui';
import { TASK_PRIORITY_META, TASK_PRIORITY_ORDER } from '@/constants';
import { useCategories } from '@/hooks/useCategories';
import { spacing } from '@/theme';
import type { DateOnly, ID, TaskPriority, TimeOfDay } from '@/types';

import type { TaskDraft } from '../taskService';

export interface TaskFormProps {
  initialDraft: TaskDraft;
  submitLabel: string;
  onSubmit: (draft: TaskDraft) => void;
  onDelete?: () => void;
  isSubmitting: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
}

const PRIORITY_OPTIONS: ChipOption<TaskPriority>[] = TASK_PRIORITY_ORDER.map((priority) => ({
  value: priority,
  label: TASK_PRIORITY_META[priority].label,
  color: TASK_PRIORITY_META[priority].color,
  icon: TASK_PRIORITY_META[priority].icon,
}));

/**
 * Formulario de tarea, compartido por crear y editar.
 *
 * Mantiene el borrador en estado local y solo lo entrega al confirmar: la
 * pantalla decide qué hacer con él (crear o actualizar) y este componente no
 * necesita saber en cuál de los dos casos está.
 */
export function TaskForm({
  initialDraft,
  submitLabel,
  onSubmit,
  onDelete,
  isSubmitting,
  error,
  fieldErrors,
}: TaskFormProps) {
  const [draft, setDraft] = useState<TaskDraft>(initialDraft);
  const { categories } = useCategories(null);

  const update = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  const categoryOptions: ChipOption<ID>[] = categories.map((category) => ({
    value: category.id,
    label: category.name,
    color: category.color,
  }));

  return (
    <View style={styles.container}>
      {error ? <InlineError message={error} /> : null}

      <FormSection>
        <TextField
          label="Título"
          required
          value={draft.title}
          onChangeText={(value) => update('title', value)}
          placeholder="¿Qué tienes que hacer?"
          error={fieldErrors.title}
          maxLength={120}
          autoFocus={initialDraft.title === ''}
        />

        <TextField
          label="Descripción"
          value={draft.description}
          onChangeText={(value) => update('description', value)}
          placeholder="Detalles opcionales"
          error={fieldErrors.description}
          multiline
          maxLength={1000}
        />
      </FormSection>

      <FormSection title="Clasificación">
        <ChipSelector
          label="Prioridad"
          options={PRIORITY_OPTIONS}
          value={draft.priority}
          onChange={(value) => update('priority', value ?? 'medium')}
        />

        {categoryOptions.length > 0 ? (
          <ChipSelector
            label="Categoría"
            options={categoryOptions}
            value={draft.categoryId}
            onChange={(value) => update('categoryId', value)}
            clearable
            hint="Toca de nuevo para quitarla."
          />
        ) : null}
      </FormSection>

      <FormSection title="Cuándo">
        <DateTimeField
          label="Fecha límite"
          mode="date"
          value={draft.dueDate}
          onChange={(value) => update('dueDate', value as DateOnly | null)}
          error={fieldErrors.dueDate}
        />

        <DateTimeField
          label="Hora"
          mode="time"
          value={draft.dueTime}
          onChange={(value) => update('dueTime', value as TimeOfDay | null)}
          error={fieldErrors.dueTime}
        />

        <SwitchField
          label="Recordármelo"
          description={
            draft.dueTime
              ? 'Te avisamos a la hora indicada.'
              : 'Sin hora, avisamos a las 09:00 de ese día.'
          }
          value={draft.reminderEnabled}
          onChange={(value) => update('reminderEnabled', value)}
          disabled={!draft.dueDate}
        />
      </FormSection>

      <View style={styles.actions}>
        <Button
          label={submitLabel}
          onPress={() => onSubmit(draft)}
          loading={isSubmitting}
          fullWidth
          size="large"
        />

        {onDelete ? (
          <Button
            label="Eliminar tarea"
            onPress={onDelete}
            variant="danger"
            icon="trash-outline"
            fullWidth
            disabled={isSubmitting}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxl,
  },
  actions: {
    gap: spacing.md,
  },
});
