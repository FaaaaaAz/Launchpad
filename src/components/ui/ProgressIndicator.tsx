import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, gradients, motion, radius } from '@/theme';

export interface ProgressIndicatorProps {
  /** Valor entre 0 y 1. Se recorta si llega fuera de rango. */
  value: number;
  color?: string;
  height?: number;
  label?: string;
  /** Rellena con el degradado de marca en lugar de un color plano. */
  gradient?: boolean;
}

/** Barra de progreso con transición suave al cambiar el valor. */
export function ProgressIndicator({
  value,
  color = colors.accent,
  height = 6,
  label,
  gradient = false,
}: ProgressIndicatorProps) {
  const safeValue = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const animated = useRef(new Animated.Value(safeValue)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: safeValue,
      duration: motion.slow,
      // El ancho no admite driver nativo, pero la animación es puntual y corta.
      useNativeDriver: false,
    }).start();
  }, [animated, safeValue]);

  const width = animated.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(safeValue * 100) }}
      style={[styles.track, { height, borderRadius: height / 2 }]}
    >
      <Animated.View style={[styles.fill, { width, borderRadius: height / 2 }]}>
        {gradient ? (
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientFill}
          />
        ) : (
          <View style={[styles.gradientFill, { backgroundColor: color }]} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfacePressed,
    overflow: 'hidden',
    borderRadius: radius.pill,
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
  },
  gradientFill: {
    flex: 1,
  },
});
