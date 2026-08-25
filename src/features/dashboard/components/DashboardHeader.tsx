import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { spacing } from '@/theme';
import { formatFullDate, greetingForNow } from '@/utils/date';

export interface DashboardHeaderProps {
  /** Nombre del usuario. Si está vacío se saluda sin nombre. */
  userName: string;
}

/**
 * Saludo y fecha del dashboard.
 *
 * Aquí vive también el acceso a Configuración: con cinco módulos, una sexta
 * pestaña apretaría demasiado la barra inferior en un iPhone, y Configuración
 * es justamente lo que menos se visita.
 */
export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const greeting = greetingForNow();

  return (
    <View style={styles.container}>
      <View style={styles.texts}>
        <Text variant="caption" tone="muted">
          {formatFullDate()}
        </Text>
        <Text variant="display" numberOfLines={1}>
          {userName ? `${greeting}, ${userName}` : greeting}
        </Text>
      </View>

      <IconButton
        icon="settings-outline"
        accessibilityLabel="Configuración"
        onPress={() => router.push('/settings')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
