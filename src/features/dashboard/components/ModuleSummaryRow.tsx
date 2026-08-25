import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PressableScale, Text } from '@/components/ui';
import { DOMAIN_CONFIG, DOMAIN_ORDER } from '@/constants';
import { colors, radius, shadows, spacing } from '@/theme';
import type { ActivityDomain } from '@/types';

export interface ModuleSummaryRowProps {
  /** Cuántas actividades activas hay en cada módulo. */
  counts: Record<ActivityDomain, number>;
}

/** Rutas de cada módulo dentro del grupo de pestañas. */
const DOMAIN_ROUTES: Record<ActivityDomain, '/exercise' | '/academic' | '/hobbies'> = {
  exercise: '/exercise',
  academic: '/academic',
  hobby: '/hobbies',
};

/** Accesos directos a los tres módulos, con su conteo actual. */
export function ModuleSummaryRow({ counts }: ModuleSummaryRowProps) {
  return (
    <View style={styles.row}>
      {DOMAIN_ORDER.map((domain) => {
        const config = DOMAIN_CONFIG[domain];
        const count = counts[domain];

        return (
          <PressableScale
            key={domain}
            onPress={() => router.push(DOMAIN_ROUTES[domain])}
            accessibilityRole="button"
            accessibilityLabel={`${config.title}: ${count}`}
            style={styles.tile}
          >
            <View style={[styles.iconBox, { backgroundColor: `${config.color}1F` }]}>
              <Ionicons name={config.icon} size={18} color={config.color} />
            </View>

            <Text variant="title">{count}</Text>
            <Text variant="micro" tone="muted" uppercase numberOfLines={1}>
              {config.title}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg - 2,
    ...shadows.card,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
