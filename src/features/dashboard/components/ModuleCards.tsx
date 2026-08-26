import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';

import { PressableScale, Text } from '@/components/ui';
import { DOMAIN_CONFIG, DOMAIN_ORDER, mascot } from '@/constants';
import { colors, radius, shadows, spacing } from '@/theme';
import type { ActivityDomain } from '@/types';
import { pluralize } from '@/utils/format';

export interface ModuleCardsProps {
  /** Cuántas actividades activas hay en cada módulo. */
  counts: Record<ActivityDomain, number>;
}

/** Rutas de cada módulo dentro del grupo de pestañas. */
const DOMAIN_ROUTES: Record<ActivityDomain, '/exercise' | '/academic' | '/hobbies'> = {
  exercise: '/exercise',
  academic: '/academic',
  hobby: '/hobbies',
};

/** Alto de la card. Fija el tamaño con el que se dibuja la ilustración. */
const CARD_HEIGHT = 118;

/**
 * Accesos a los tres módulos, uno por fila.
 *
 * Antes eran tres columnas con un ícono pequeño. Las ilustraciones de la
 * mascota son escenas con mucho detalle (mancuernas, libros, cascos) y a un
 * tercio del ancho no se distinguía nada: a fila completa cada una se lee y
 * le da carácter a la pantalla.
 */
export function ModuleCards({ counts }: ModuleCardsProps) {
  return (
    <View style={styles.stack}>
      {DOMAIN_ORDER.map((domain) => (
        <ModuleCard key={domain} domain={domain} count={counts[domain]} />
      ))}
    </View>
  );
}

function ModuleCard({ domain, count }: { domain: ActivityDomain; count: number }) {
  const config = DOMAIN_CONFIG[domain];

  const summary =
    count === 0
      ? 'Sin actividades todavía'
      : `${count} ${pluralize(count, config.itemLabel, config.itemLabelPlural)}`;

  return (
    <PressableScale
      onPress={() => router.push(DOMAIN_ROUTES[domain])}
      accessibilityRole="button"
      accessibilityLabel={`${config.title}: ${summary}`}
      style={styles.card}
    >
      {/* Lavado de color hacia la ilustración: la integra con la card en lugar
          de que parezca una imagen pegada encima. */}
      <LinearGradient
        colors={['transparent', `${config.color}1F`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* El nombre del módulo va primero y el conteo debajo: la ilustración
          deja poco ancho, y así ninguna línea necesita recortarse con
          puntos suspensivos. */}
      <View style={styles.body}>
        <Text variant="title" numberOfLines={1}>
          {config.title}
        </Text>

        <View style={styles.footer}>
          <Text variant="caption" color={config.color} numberOfLines={1}>
            {summary}
          </Text>
          <Ionicons name="chevron-forward" size={13} color={config.color} />
        </View>
      </View>

      <Image
        source={mascot[config.mascot]}
        style={styles.mascot}
        resizeMode="contain"
        accessible={false}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CARD_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingLeft: spacing.lg,
    ...shadows.card,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  mascot: {
    width: CARD_HEIGHT * 1.15,
    height: CARD_HEIGHT,
  },
});
