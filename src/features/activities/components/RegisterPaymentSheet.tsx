import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DateTimeField, TextField } from '@/components/form';
import { BottomSheet, Button, InlineError, Text } from '@/components/ui';
import { spacing } from '@/theme';
import type { Activity, DateOnly } from '@/types';
import { formatDateLong, today } from '@/utils/date';
import { currencySymbol, parseAmount } from '@/utils/format';

import { advancePaymentDate } from '../activityService';

export interface RegisterPaymentSheetProps {
  activity: Activity;
  visible: boolean;
  onClose: () => void;
  onConfirm: (input: { amount: number; paidAt: DateOnly }) => void;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Hoja para registrar un pago.
 *
 * Viene rellenada con el monto de la actividad y la fecha de hoy, que es el
 * caso habitual: pagué hoy lo que cuesta siempre. Cambiar cualquiera de los
 * dos sigue siendo posible sin salir de aquí.
 */
export function RegisterPaymentSheet({
  activity,
  visible,
  onClose,
  onConfirm,
  isSubmitting,
  error,
}: RegisterPaymentSheetProps) {
  const [amount, setAmount] = useState(
    activity.billingAmount === null ? '' : String(activity.billingAmount),
  );
  const [paidAt, setPaidAt] = useState<DateOnly>(today());
  const [validationError, setValidationError] = useState<string | null>(null);

  const nextDue = advancePaymentDate(activity.nextPaymentDate ?? paidAt, activity.billingCycle);

  // La hoja permanece montada para conservar su animación, así que hay que
  // devolverla a los valores por defecto cada vez que se abre; si no, mostraría
  // lo que el usuario escribió y descartó la vez anterior.
  useEffect(() => {
    if (!visible) return;
    setAmount(activity.billingAmount === null ? '' : String(activity.billingAmount));
    setPaidAt(today());
    setValidationError(null);
  }, [visible, activity.billingAmount]);

  const handleConfirm = () => {
    const parsed = parseAmount(amount);

    if (parsed === null || parsed <= 0) {
      setValidationError('Indica un monto válido.');
      return;
    }

    setValidationError(null);
    onConfirm({ amount: parsed, paidAt });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text variant="title">Registrar pago</Text>
        <Text variant="caption" tone="muted">
          {activity.name}
        </Text>
      </View>

      {error ?? validationError ? (
        <InlineError message={error ?? validationError ?? ''} />
      ) : null}

      <TextField
        label="Monto"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        prefix={currencySymbol(activity.currency)}
        placeholder="0"
      />

      <DateTimeField
        label="Fecha de pago"
        mode="date"
        value={paidAt}
        onChange={(value) => setPaidAt((value as DateOnly | null) ?? today())}
        clearable={false}
      />

      {nextDue ? (
        <Text variant="caption" tone="muted">
          El próximo vencimiento pasará al {formatDateLong(nextDue)}.
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Registrar"
          onPress={handleConfirm}
          loading={isSubmitting}
          fullWidth
          size="large"
        />
        <Button label="Cancelar" onPress={onClose} variant="ghost" fullWidth />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 2,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
