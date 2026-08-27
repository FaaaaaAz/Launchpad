import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { MASCOT_NAME, getSportConfig, mascot } from '@/constants';
import type { SportKey } from '@/constants';
import { colors, radius, spacing } from '@/theme';

export interface PadCoachProps {
  sport: SportKey;
}

/**
 * PAD acompañando una actividad con la frase de su deporte.
 *
 * Es el único sitio donde la app «habla»: una línea corta y con carácter, no
 * un párrafo motivacional. Si dijera demasiado, dejaría de leerse.
 */
export function PadCoach({ sport }: PadCoachProps) {
  const config = getSportConfig(sport);
  const illustration = config.mascot ? mascot[config.mascot] : mascot.sports;

  return (
    <View style={styles.container}>
      <Image
        source={illustration}
        style={styles.mascot}
        resizeMode="contain"
        accessible={false}
      />

      <View style={styles.bubble}>
        <Text variant="micro" tone="muted" uppercase>
          {MASCOT_NAME} dice
        </Text>
        <Text variant="bodyStrong" style={styles.line}>
          {config.motivation}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentBorder,
    padding: spacing.md,
  },
  mascot: {
    width: 64,
    height: 64,
  },
  bubble: {
    flex: 1,
    gap: 2,
  },
  line: {
    lineHeight: 20,
  },
});
