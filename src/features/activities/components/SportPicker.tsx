import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, View } from 'react-native';

import { FieldShell } from '@/components/form';
import { PressableScale, Text } from '@/components/ui';
import { SPORT_CONFIG, SPORT_ORDER, mascot } from '@/constants';
import type { SportKey } from '@/constants';
import { colors, radius, spacing } from '@/theme';

export interface SportPickerProps {
  label?: string;
  value: SportKey | null;
  onChange: (value: SportKey | null) => void;
  hint?: string;
}

const TILE_HEIGHT = 108;

/**
 * Elección del deporte a partir de las ilustraciones de PAD.
 *
 * Se eligió mostrar los dibujos y no una lista de texto porque es la decisión
 * que le da personalidad a la actividad: al ver a PAD nadando o boxeando, uno
 * elige mirando, no leyendo.
 */
export function SportPicker({ label, value, onChange, hint }: SportPickerProps) {
  return (
    <FieldShell label={label} hint={hint}>
      <View style={styles.grid}>
        {SPORT_ORDER.map((key) => {
          const config = SPORT_CONFIG[key];
          const isSelected = value === key;
          const illustration = config.mascot ? mascot[config.mascot] : null;

          return (
            <PressableScale
              key={key}
              onPress={() => onChange(isSelected ? null : key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={config.label}
              style={[styles.tile, isSelected ? styles.tileSelected : styles.tileIdle]}
            >
              {illustration ? (
                <Image
                  source={illustration}
                  style={styles.illustration}
                  resizeMode="contain"
                  accessible={false}
                />
              ) : (
                <View style={styles.illustration}>
                  <Ionicons name={config.icon} size={28} color={colors.textMuted} />
                </View>
              )}

              <Text
                variant="micro"
                color={isSelected ? colors.accent : colors.textSecondary}
                numberOfLines={1}
              >
                {config.label}
              </Text>

              {isSelected ? (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={11} color={colors.textOnAccent} />
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    // Cuatro por fila descontando los tres huecos de separación.
    width: `${100 / 4}%`,
    flexGrow: 1,
    flexBasis: 76,
    maxWidth: 110,
    height: TILE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    overflow: 'hidden',
  },
  tileIdle: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  tileSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  illustration: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
