import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/theme';

/** Separador entre el acceso con correo y el acceso con Google. */
export function AuthDivider({ label = 'o' }: { label?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
