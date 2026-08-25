import { StyleSheet, Switch, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Text } from '../ui/Text';

export interface SwitchFieldProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  error?: string;
}

export function SwitchField({
  label,
  description,
  value,
  onChange,
  disabled = false,
  error,
}: SwitchFieldProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.row, disabled && styles.disabled]}>
        <View style={styles.texts}>
          <Text variant="bodyStrong">{label}</Text>
          {description ? (
            <Text variant="caption" tone="muted">
              {description}
            </Text>
          ) : null}
        </View>

        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ false: colors.surfacePressed, true: colors.accent }}
          thumbColor={colors.textPrimary}
          ios_backgroundColor={colors.surfacePressed}
          accessibilityLabel={label}
        />
      </View>

      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg - 2,
  },
  disabled: {
    opacity: 0.5,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
