import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import type { IconName } from '@/constants';
import { colors, motion, radius, spacing } from '@/theme';
import { dayPeriod, formatFullDate, greetingForNow } from '@/utils/date';
import type { DayPeriod } from '@/utils/date';

export interface DashboardHeaderProps {
  /** Nombre del usuario. Si está vacío se saluda sin nombre. */
  userName: string;
}

/** Ícono que acompaña a la fecha según la franja del día. */
const PERIOD_ICONS: Record<DayPeriod, IconName> = {
  night: 'moon',
  morning: 'partly-sunny',
  afternoon: 'sunny',
  evening: 'moon-outline',
};

/**
 * Saludo y fecha del dashboard.
 *
 * El saludo y el nombre van en líneas separadas a propósito: en una sola línea,
 * un nombre medianamente largo obligaba a recortar con puntos suspensivos
 * («Buenas tardes, Edw…»), que además de feo escondía justo la parte personal.
 *
 * Aquí vive también el acceso a Configuración: con cinco módulos, una sexta
 * pestaña apretaría demasiado la barra inferior en un iPhone, y Configuración
 * es justamente lo que menos se visita.
 */
export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const period = dayPeriod();

  // Entrada suave: es lo primero que se ve al abrir la app.
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.slow,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.slow,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.texts, { opacity, transform: [{ translateY }] }]}>
        <View style={styles.datePill}>
          <Ionicons name={PERIOD_ICONS[period]} size={12} color={colors.accent} />
          <Text variant="micro" tone="muted">
            {formatFullDate()}
          </Text>
        </View>

        <Text variant="title" tone="secondary" style={styles.greeting}>
          {greetingForNow()}
        </Text>

        {userName ? (
          <Text
            variant="display"
            color={colors.accent}
            numberOfLines={1}
            // Un nombre muy largo encoge en vez de recortarse.
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {userName}
          </Text>
        ) : null}
      </Animated.View>

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
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.md - 2,
    marginBottom: spacing.xs,
  },
  greeting: {
    // Pega el saludo al nombre para que se lean como un bloque.
    marginBottom: -spacing.xs,
  },
});
