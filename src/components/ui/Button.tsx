import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/constants';
import { colors, radius, spacing, MIN_TOUCH_SIZE } from '@/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'small' | 'medium' | 'large';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  /** Ocupa todo el ancho disponible. */
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_STYLES: Record<Variant, { background: string; border: string; text: string }> = {
  primary: { background: colors.accent, border: colors.accent, text: colors.textOnAccent },
  secondary: {
    background: colors.surfaceElevated,
    border: colors.border,
    text: colors.textPrimary,
  },
  ghost: { background: 'transparent', border: 'transparent', text: colors.textSecondary },
  danger: { background: colors.dangerSoft, border: colors.dangerSoft, text: colors.danger },
};

const SIZE_STYLES: Record<Size, { paddingVertical: number; paddingHorizontal: number; iconSize: number }> =
  {
    small: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, iconSize: 16 },
    medium: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, iconSize: 18 },
    large: { paddingVertical: spacing.lg - 2, paddingHorizontal: spacing.xl, iconSize: 20 },
  };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  fullWidth = false,
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const palette = VARIANT_STYLES[variant];
  const sizing = SIZE_STYLES[size];
  const isInactive = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={[
        styles.base,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          paddingVertical: sizing.paddingVertical,
          paddingHorizontal: sizing.paddingHorizontal,
        },
        fullWidth && styles.fullWidth,
        isInactive && styles.inactive,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={palette.text} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={sizing.iconSize} color={palette.text} /> : null}
            <Text variant={size === 'small' ? 'caption' : 'bodyStrong'} color={palette.text}>
              {label}
            </Text>
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  inactive: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
