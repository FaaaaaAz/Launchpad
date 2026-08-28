import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, HIT_SLOP, spacing } from '@/theme';

export interface AuthLinkProps {
  /** Texto en gris que antecede al enlace: "¿No tienes una cuenta?". */
  question?: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * Enlace de texto de las pantallas de acceso.
 *
 * No se usa `Button variant="ghost"` porque tiene la altura minima tactil de
 * 44 px y su propio relleno: puesto debajo de un formulario, separa demasiado
 * y parece otra accion principal. Aqui la zona tactil se consigue con
 * `hitSlop`, que agranda el area sin agrandar el dibujo.
 */
export function AuthLink({ question, label, onPress, disabled = false }: AuthLinkProps) {
  return (
    <View style={styles.row}>
      {question ? (
        <Text variant="caption" tone="muted">
          {question}
        </Text>
      ) : null}

      <Pressable
        onPress={onPress}
        disabled={disabled}
        hitSlop={HIT_SLOP}
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      >
        <Text variant="caption" color={disabled ? colors.textDisabled : colors.accent}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
