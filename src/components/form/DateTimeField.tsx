import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, HIT_SLOP } from '@/theme';
import type { DateOnly, TimeOfDay } from '@/types';
import {
  formatDateLong,
  parseDateOnly,
  parseTimeOfDay,
  toDateOnly,
  toTimeOfDay,
} from '@/utils/date';

import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { FieldShell } from './FieldShell';

export interface DateTimeFieldProps {
  label: string;
  mode: 'date' | 'time';
  /** 'YYYY-MM-DD' en modo fecha, 'HH:mm' en modo hora. */
  value: DateOnly | TimeOfDay | null;
  onChange: (value: DateOnly | TimeOfDay | null) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Permite dejar el campo vacío con la X. */
  clearable?: boolean;
}

/**
 * Campo de fecha u hora con el selector nativo.
 *
 * En Android el selector es un diálogo del sistema que se monta y se cierra
 * solo; en iOS es una vista que hay que envolver en un modal propio con sus
 * botones. Esa diferencia se resuelve aquí, una sola vez.
 */
export function DateTimeField({
  label,
  mode,
  value,
  onChange,
  placeholder,
  hint,
  error,
  clearable = true,
}: DateTimeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() => toPickerDate(value, mode));

  const displayValue = formatValue(value, mode);

  const open = () => {
    setDraftDate(toPickerDate(value, mode));
    setIsOpen(true);
  };

  const commit = (date: Date) => {
    onChange(mode === 'date' ? toDateOnly(date) : toTimeOfDay(date));
  };

  const handleAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setIsOpen(false);
    if (event.type === 'set' && date) commit(date);
  };

  return (
    <FieldShell label={label} hint={hint} error={error}>
      <View style={styles.row}>
        <PressableScale
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${displayValue ?? 'sin definir'}`}
          style={[styles.control, Boolean(error) && styles.errored]}
        >
          <Ionicons
            name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
            size={17}
            color={colors.textMuted}
          />
          <Text variant="body" tone={displayValue ? 'primary' : 'disabled'}>
            {displayValue ?? placeholder ?? (mode === 'date' ? 'Elegir fecha' : 'Elegir hora')}
          </Text>
        </PressableScale>

        {clearable && value ? (
          <Pressable
            onPress={() => onChange(null)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${label}`}
            style={styles.clear}
          >
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {isOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={draftDate}
          mode={mode}
          onChange={handleAndroidChange}
          is24Hour
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={isOpen} transparent animationType="fade">
          <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
            {/* El Pressable interior detiene el toque para que no cierre el modal. */}
            <Pressable style={styles.sheet} onPress={() => undefined}>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setIsOpen(false)} hitSlop={HIT_SLOP}>
                  <Text variant="body" tone="muted">
                    Cancelar
                  </Text>
                </Pressable>

                <Text variant="bodyStrong">{label}</Text>

                <Pressable
                  onPress={() => {
                    commit(draftDate);
                    setIsOpen(false);
                  }}
                  hitSlop={HIT_SLOP}
                >
                  <Text variant="bodyStrong" tone="accent">
                    Listo
                  </Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={draftDate}
                mode={mode}
                display="spinner"
                themeVariant="dark"
                locale="es-ES"
                is24Hour
                onChange={(_event, date) => {
                  if (date) setDraftDate(date);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </FieldShell>
  );
}

/** Valor inicial del selector: el actual del campo, o ahora mismo. */
function toPickerDate(value: string | null, mode: 'date' | 'time'): Date {
  if (!value) return new Date();

  if (mode === 'date') {
    return parseDateOnly(value) ?? new Date();
  }

  const parsed = parseTimeOfDay(value);
  const date = new Date();
  if (parsed) date.setHours(parsed.hours, parsed.minutes, 0, 0);
  return date;
}

function formatValue(value: string | null, mode: 'date' | 'time'): string | null {
  if (!value) return null;
  return mode === 'date' ? formatDateLong(value) : value;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  control: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg - 2,
    minHeight: 48,
  },
  errored: {
    borderColor: colors.danger,
  },
  clear: {
    padding: spacing.xs,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingBottom: spacing.xxxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
