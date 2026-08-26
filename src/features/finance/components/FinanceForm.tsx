import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipSelector, FormSection, SwitchField, TextField } from '@/components/form';
import type { ChipOption } from '@/components/form';
import { Button, InlineError } from '@/components/ui';
import { FINANCE_KIND_CONFIG, FINANCE_KIND_ORDER, getFinanceKindConfig } from '@/constants';
import { spacing } from '@/theme';
import type { FinanceKind } from '@/types';
import { currencySymbol } from '@/utils/format';

import type { FinanceDraft } from '../financeService';

export interface FinanceFormProps {
  initialDraft: FinanceDraft;
  currency: string;
  submitLabel: string;
  onSubmit: (draft: FinanceDraft) => void;
  onDelete?: () => void;
  /** Al editar, el tipo no se puede cambiar: cambiaría el significado de los montos. */
  lockKind?: boolean;
  isSubmitting: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
}

const KIND_OPTIONS: ChipOption<FinanceKind>[] = FINANCE_KIND_ORDER.map((kind) => ({
  value: kind,
  label: FINANCE_KIND_CONFIG[kind].label,
  color: FINANCE_KIND_CONFIG[kind].color,
  icon: FINANCE_KIND_CONFIG[kind].icon,
}));

/** Formulario de un movimiento de la alcancía, compartido por crear y editar. */
export function FinanceForm({
  initialDraft,
  currency,
  submitLabel,
  onSubmit,
  onDelete,
  lockKind = false,
  isSubmitting,
  error,
  fieldErrors,
}: FinanceFormProps) {
  const [draft, setDraft] = useState<FinanceDraft>(initialDraft);
  const config = getFinanceKindConfig(draft.kind);
  const symbol = currencySymbol(currency);

  const update = <K extends keyof FinanceDraft>(key: K, value: FinanceDraft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  return (
    <View style={styles.container}>
      {error ? <InlineError message={error} /> : null}

      <FormSection description={config.description}>
        {!lockKind ? (
          <ChipSelector
            label="Tipo"
            options={KIND_OPTIONS}
            value={draft.kind}
            onChange={(value) => update('kind', value ?? 'expense')}
          />
        ) : null}

        <TextField
          label="Nombre"
          required
          value={draft.name}
          onChangeText={(value) => update('name', value)}
          placeholder={
            draft.kind === 'income'
              ? 'Sueldo'
              : draft.kind === 'expense'
                ? 'Alquiler'
                : draft.kind === 'debt'
                  ? 'Préstamo del celular'
                  : 'Viaje de fin de año'
          }
          error={fieldErrors.name}
          maxLength={60}
          autoFocus={initialDraft.name === ''}
        />

        <TextField
          label={config.amountLabel}
          required={!config.hasGoal}
          value={draft.amount}
          onChangeText={(value) => update('amount', value)}
          placeholder="0"
          keyboardType="decimal-pad"
          prefix={symbol}
          error={fieldErrors.amount}
          hint={
            config.hasGoal ? 'Lo que aportas o pagas cada mes. Opcional.' : undefined
          }
        />
      </FormSection>

      {config.hasGoal ? (
        <FormSection title={draft.kind === 'debt' ? 'La deuda' : 'La meta'}>
          <TextField
            label={config.targetLabel}
            required
            value={draft.targetAmount}
            onChangeText={(value) => update('targetAmount', value)}
            placeholder="0"
            keyboardType="decimal-pad"
            prefix={symbol}
            error={fieldErrors.targetAmount}
          />

          <TextField
            label={config.settledLabel}
            value={draft.settledAmount}
            onChangeText={(value) => update('settledAmount', value)}
            placeholder="0"
            keyboardType="decimal-pad"
            prefix={symbol}
            error={fieldErrors.settledAmount}
            hint="Cuánto llevas hasta hoy. La barra de progreso sale de aquí."
          />
        </FormSection>
      ) : null}

      <FormSection title="Control mensual">
        <TextField
          label="Día del mes"
          value={draft.dueDay}
          onChangeText={(value) => update('dueDay', value)}
          placeholder="10"
          keyboardType="number-pad"
          error={fieldErrors.dueDay}
          hint="Si lo indicas, podrás marcar cada mes como cubierto. Opcional."
        />

        <SwitchField
          label="Activo"
          description="Los movimientos en pausa no cuentan en el resumen."
          value={draft.isActive}
          onChange={(value) => update('isActive', value)}
        />
      </FormSection>

      <FormSection title="Notas">
        <TextField
          label="Notas"
          value={draft.notes}
          onChangeText={(value) => update('notes', value)}
          placeholder="Banco, número de cuota, con quién es la deuda…"
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
  actions: {
    gap: spacing.md,
  },
});
