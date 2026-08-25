import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Animated, Pressable } from 'react-native';
import type { PressableProps, ViewStyle, StyleProp } from 'react-native';

import { motion } from '@/theme';

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Cuánto se encoge al pulsar. 1 = sin efecto. */
  activeScale?: number;
}

/**
 * Pressable con una reducción de escala al pulsar.
 *
 * Es el único efecto de "táctil" de la app: sutil, uniforme y sin librerías
 * de animación extra. Usa el driver nativo para no bloquear el hilo de JS.
 */
export function PressableScale({
  style,
  activeScale = 0.97,
  disabled,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number, duration: number) => {
    Animated.timing(scale, {
      toValue: value,
      duration,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) animateTo(activeScale, motion.fast);
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(1, motion.base);
        rest.onPressOut?.(event);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
