import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { IconName } from '@/constants';
import { colors, radius, spacing } from '@/theme';

import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { FieldShell } from './FieldShell';

export interface ChipOption<T> {
  value: T;
  label: string;
  color?: string;
  icon?: IconName;
}

export interface ChipSelectorProps<T> {
  label?: string;
  options: ChipOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  /** Permite deseleccionar tocando la opción activa. */
  clearable?: boolean;
  hint?: string;
  error?: string;
  /** Desplaza horizontalmente en vez de envolver en varias líneas. */
  horizontal?: boolean;
}

/**
 * Selector de una opción entre varias, en forma de chips.
 *
 * Se usa en lugar de un desplegable porque en móvil un toque directo es más
 * rápido y deja ver todas las opciones sin abrir nada.
 */
export function ChipSelector<T extends string>({
  label,
  options,
  value,
  onChange,
  clearable = false,
  hint,
  error,
  horizontal = false,
}: ChipSelectorProps<T>) {
  const chips = options.map((option) => {
    const isSelected = option.value === value;
    const accent = option.color ?? colors.accent;

    return (
      <PressableScale
        key={option.value}
        onPress={() => onChange(isSelected && clearable ? null : option.value)}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={option.label}
        style={[
          styles.chip,
          isSelected
            ? { backgroundColor: `${accent}26`, borderColor: accent }
            : styles.chipIdle,
        ]}
      >
        {option.icon ? (
          <Ionicons
            name={option.icon}
            size={14}
            color={isSelected ? accent : colors.textMuted}
          />
        ) : null}
        <Text variant="caption" color={isSelected ? accent : colors.textSecondary}>
          {option.label}
        </Text>
      </PressableScale>
    );
  });

  return (
    <FieldShell label={label} hint={hint} error={error}>
      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
        >
          {chips}
        </ScrollView>
      ) : (
        <View style={styles.wrap}>{chips}</View>
      )}
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scrollRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipIdle: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
});
