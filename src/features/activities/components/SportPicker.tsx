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

/** Columnas de la cuadrícula. Tres dejan sitio para leer el nombre completo. */
const COLUMNS = 3;
/** Separación entre celdas. Se aplica como relleno interno, no con `gap`. */
const GUTTER = spacing.sm;
/** Alto reservado a la ilustración dentro de cada celda. */
const ILLUSTRATION_HEIGHT = 76;

/**
 * Elección del deporte a partir de las ilustraciones de PAD.
 *
 * Se eligió mostrar los dibujos y no una lista de texto porque es la decisión
 * que le da personalidad a la actividad: al ver a PAD nadando o boxeando, uno
 * elige mirando, no leyendo.
 *
 * Sobre la cuadrícula: las celdas miden un porcentaje exacto y la separación se
 * consigue con relleno interno más un margen negativo en el contenedor. Mezclar
 * anchos porcentuales con `gap` hace que la suma pase del 100 % y las celdas se
 * estrujen o salten de fila.
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
            <View key={key} style={styles.cell}>
              <PressableScale
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
                    // `contain` conserva la proporción original de cada dibujo:
                    // unos son verticales y otros apaisados.
                    resizeMode="contain"
                    accessible={false}
                  />
                ) : (
                  <View style={styles.illustrationFallback}>
                    <Ionicons name={config.icon} size={32} color={colors.textMuted} />
                  </View>
                )}

                <Text
                  variant="caption"
                  color={isSelected ? colors.accent : colors.textSecondary}
                  numberOfLines={1}
                  style={styles.label}
                >
                  {config.label}
                </Text>

                {isSelected ? (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={12} color={colors.textOnAccent} />
                  </View>
                ) : null}
              </PressableScale>
            </View>
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
    // Compensa el relleno de las celdas para que la cuadrícula quede alineada
    // con el resto del formulario.
    marginHorizontal: -GUTTER / 2,
  },
  cell: {
    width: `${100 / COLUMNS}%`,
    padding: GUTTER / 2,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
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
    width: '100%',
    height: ILLUSTRATION_HEIGHT,
  },
  illustrationFallback: {
    width: '100%',
    height: ILLUSTRATION_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
