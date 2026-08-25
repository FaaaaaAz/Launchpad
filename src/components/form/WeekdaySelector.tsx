import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import type { Weekday } from '@/types';
import { WEEKDAYS, weekdayInitial, weekdayName } from '@/utils/date';

import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { FieldShell } from './FieldShell';

export interface WeekdaySelectorProps {
  label?: string;
  value: Weekday[];
  onChange: (value: Weekday[]) => void;
  /** Color de los días activos. Por defecto el acento del módulo. */
  accentColor?: string;
  hint?: string;
  error?: string;
}

/** Selección múltiple de días de la semana, de lunes a domingo. */
export function WeekdaySelector({
  label,
  value,
  onChange,
  accentColor = colors.accent,
  hint,
  error,
}: WeekdaySelectorProps) {
  const toggle = (day: Weekday) => {
    onChange(
      value.includes(day) ? value.filter((item) => item !== day) : [...value, day],
    );
  };

  return (
    <FieldShell label={label} hint={hint} error={error}>
      <View style={styles.row}>
        {WEEKDAYS.map((day) => {
          const isSelected = value.includes(day);

          return (
            <PressableScale
              key={day}
              onPress={() => toggle(day)}
              accessibilityRole="button"
              accessibilityLabel={weekdayName(day)}
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.day,
                isSelected
                  ? { backgroundColor: `${accentColor}26`, borderColor: accentColor }
                  : styles.dayIdle,
              ]}
            >
              <Text
                variant="caption"
                color={isSelected ? accentColor : colors.textMuted}
              >
                {weekdayInitial(day)}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  day: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dayIdle: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
});
