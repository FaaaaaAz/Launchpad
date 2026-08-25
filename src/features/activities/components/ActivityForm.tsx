import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ChipSelector,
  DateTimeField,
  FormSection,
  ImageField,
  SwitchField,
  TextField,
  WeekdaySelector,
} from '@/components/form';
import type { ChipOption } from '@/components/form';
import { Button, InlineError } from '@/components/ui';
import {
  ACTIVITY_STATUS_META,
  ACTIVITY_STATUS_ORDER,
  BILLING_CYCLE_LABELS,
  BILLING_CYCLE_ORDER,
  getDomainConfig,
} from '@/constants';
import { useCategories } from '@/hooks/useCategories';
import { spacing } from '@/theme';
import type {
  ActivityDomain,
  ActivityStatus,
  BillingCycle,
  DateOnly,
  ID,
  TimeOfDay,
} from '@/types';
import { currencySymbol } from '@/utils/format';

import type { ActivityDraft } from '../activityService';

export interface ActivityFormProps {
  domain: ActivityDomain;
  initialDraft: ActivityDraft;
  submitLabel: string;
  onSubmit: (draft: ActivityDraft) => void;
  onDelete?: () => void;
  isSubmitting: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
}

const STATUS_OPTIONS: ChipOption<ActivityStatus>[] = ACTIVITY_STATUS_ORDER.map((status) => ({
  value: status,
  label: ACTIVITY_STATUS_META[status].label,
  color: ACTIVITY_STATUS_META[status].color,
  icon: ACTIVITY_STATUS_META[status].icon,
}));

const BILLING_OPTIONS: ChipOption<BillingCycle>[] = BILLING_CYCLE_ORDER.map((cycle) => ({
  value: cycle,
  label: BILLING_CYCLE_LABELS[cycle],
}));

/**
 * Formulario de actividad, usado por Ejercicio, Académico y Hobbies.
 *
 * Los textos y el color cambian según el dominio, pero la estructura es la
 * misma: es exactamente la ventaja de haber modelado una sola entidad.
 */
export function ActivityForm({
  domain,
  initialDraft,
  submitLabel,
  onSubmit,
  onDelete,
  isSubmitting,
  error,
  fieldErrors,
}: ActivityFormProps) {
  const [draft, setDraft] = useState<ActivityDraft>(initialDraft);
  const { categories } = useCategories(domain);
  const config = getDomainConfig(domain);

  const update = <K extends keyof ActivityDraft>(key: K, value: ActivityDraft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  const categoryOptions: ChipOption<ID>[] = categories.map((category) => ({
    value: category.id,
    label: category.name,
    color: category.color,
  }));

  const hasBilling = draft.billingCycle !== 'none';
  const symbol = currencySymbol(draft.currency);

  return (
    <View style={styles.container}>
      {error ? <InlineError message={error} /> : null}

      <FormSection>
        <ImageField
          label="Imagen"
          value={draft.imageKey}
          onChange={(value) => update('imageKey', value)}
          accentColor={config.color}
          hint="Opcional. Ayuda a reconocer la actividad de un vistazo."
        />

        <TextField
          label="Nombre"
          required
          value={draft.name}
          onChangeText={(value) => update('name', value)}
          placeholder={config.namePlaceholder}
          error={fieldErrors.name}
          maxLength={80}
          autoFocus={initialDraft.name === ''}
        />

        <TextField
          label={config.subtitleLabel}
          value={draft.subtitle}
          onChangeText={(value) => update('subtitle', value)}
          placeholder={config.subtitlePlaceholder}
          error={fieldErrors.subtitle}
          maxLength={120}
        />

        {categoryOptions.length > 0 ? (
          <ChipSelector
            label="Categoría"
            options={categoryOptions}
            value={draft.categoryId}
            onChange={(value) => update('categoryId', value)}
            clearable
          />
        ) : null}

        <ChipSelector
          label="Estado"
          options={STATUS_OPTIONS}
          value={draft.status}
          onChange={(value) => update('status', value ?? 'active')}
        />
      </FormSection>

      <FormSection title="Horario">
        <WeekdaySelector
          label="Días"
          value={draft.weekdays}
          onChange={(value) => update('weekdays', value)}
          accentColor={config.color}
        />

        <View style={styles.timeRow}>
          <View style={styles.timeColumn}>
            <DateTimeField
              label="Desde"
              mode="time"
              value={draft.startTime}
              onChange={(value) => update('startTime', value as TimeOfDay | null)}
              error={fieldErrors.startTime}
            />
          </View>

          <View style={styles.timeColumn}>
            <DateTimeField
              label="Hasta"
              mode="time"
              value={draft.endTime}
              onChange={(value) => update('endTime', value as TimeOfDay | null)}
              error={fieldErrors.endTime}
            />
          </View>
        </View>

        <DateTimeField
          label="Fecha de inicio"
          mode="date"
          value={draft.startDate}
          onChange={(value) => update('startDate', value as DateOnly | null)}
          error={fieldErrors.startDate}
        />

        <DateTimeField
          label="Fecha de vencimiento"
          mode="date"
          value={draft.endDate}
          onChange={(value) => update('endDate', value as DateOnly | null)}
          error={fieldErrors.endDate}
          hint="Cuándo termina la membresía, el curso o la inscripción."
        />
      </FormSection>

      <FormSection
        title="Dinero"
        description="Solo si esta actividad tiene un costo asociado."
      >
        <ChipSelector
          label="Ciclo de cobro"
          options={BILLING_OPTIONS}
          value={draft.billingCycle}
          onChange={(value) => update('billingCycle', value ?? 'none')}
        />

        {hasBilling ? (
          <>
            <TextField
              label="Monto"
              required
              value={draft.billingAmount}
              onChangeText={(value) => update('billingAmount', value)}
              placeholder="250"
              keyboardType="decimal-pad"
              prefix={symbol}
              error={fieldErrors.billingAmount}
            />

            <DateTimeField
              label="Último pago"
              mode="date"
              value={draft.lastPaymentDate}
              onChange={(value) => update('lastPaymentDate', value as DateOnly | null)}
            />

            <DateTimeField
              label="Próximo pago"
              mode="date"
              value={draft.nextPaymentDate}
              onChange={(value) => update('nextPaymentDate', value as DateOnly | null)}
              error={fieldErrors.nextPaymentDate}
            />

            <SwitchField
              label="Avisarme antes del vencimiento"
              description="Notificación 2 días antes, a las 09:00."
              value={draft.paymentReminderEnabled}
              onChange={(value) => update('paymentReminderEnabled', value)}
              disabled={!draft.nextPaymentDate}
            />
          </>
        ) : null}
      </FormSection>

      <FormSection title="Notas">
        <TextField
          label="Notas"
          value={draft.notes}
          onChangeText={(value) => update('notes', value)}
          placeholder="Rutina, contacto, lo que quieras recordar"
          multiline
          maxLength={1000}
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
            label="Eliminar"
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
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeColumn: {
    flex: 1,
  },
  actions: {
    gap: spacing.md,
  },
});
