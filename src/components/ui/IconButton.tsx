import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/constants';
import { colors, radius, HIT_SLOP } from '@/theme';

import { PressableScale } from './PressableScale';

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  /** Etiqueta para lectores de pantalla. Obligatoria: el ícono solo no comunica. */
  accessibilityLabel: string;
  color?: string;
  backgroundColor?: string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color = colors.textSecondary,
  backgroundColor = colors.surfaceElevated,
  size = 40,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        { width: size, height: size, backgroundColor },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.45} color={color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.4,
  },
});
