import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gradients, radius, spacing, typography } from '@/theme';

/** Alto de la barra sin contar el área segura. */
const BAR_HEIGHT = 64;
/** Diámetro de la burbuja del elemento activo. */
const BUBBLE_SIZE = 46;
/** Cuánto sobresale la burbuja por encima del borde superior de la barra. */
const BUBBLE_RAISE = 24;
const BAR_MARGIN = spacing.lg;

/**
 * Espacio que hay que reservar al final de una lista para que su último
 * elemento no quede debajo de la barra flotante.
 */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + BAR_MARGIN + BUBBLE_RAISE;

/**
 * Barra de navegación flotante con burbuja deslizante.
 *
 * Sustituye a la barra por defecto para poder controlar la animación: la
 * burbuja del elemento activo se desplaza con un muelle hasta la pestaña
 * elegida en lugar de aparecer de golpe.
 *
 * La animación usa `translateX` con driver nativo, así que corre en el hilo de
 * UI y no se entrecorta aunque el hilo de JavaScript esté ocupado cargando
 * datos.
 */
export function BubbleTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);

  const tabCount = state.routes.length;
  const tabWidth = tabCount > 0 ? barWidth / tabCount : 0;

  const translateX = useRef(new Animated.Value(0)).current;
  // La primera posición se coloca sin animar: al abrir la app la burbuja debe
  // estar ya en su sitio, no viajando desde el borde izquierdo.
  const hasPositioned = useRef(false);

  useEffect(() => {
    if (tabWidth === 0) return;
    const target = state.index * tabWidth;

    if (!hasPositioned.current) {
      translateX.setValue(target);
      hasPositioned.current = true;
      return;
    }

    Animated.spring(translateX, {
      toValue: target,
      useNativeDriver: true,
      speed: 14,
      bounciness: 8,
    }).start();
  }, [state.index, tabWidth, translateX]);

  const activeRoute = state.routes[state.index];
  const activeDescriptor = activeRoute ? descriptors[activeRoute.key] : undefined;
  const activeIcon = activeDescriptor?.options.tabBarIcon?.({
    focused: true,
    color: colors.textOnAccent,
    size: 22,
  });

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
        {/* Burbuja deslizante. No recibe toques: los maneja cada pestaña. */}
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.bubbleTrack, { width: tabWidth, transform: [{ translateX }] }]}
          >
            <View style={styles.bubbleShadow}>
              <LinearGradient
                colors={gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bubble}
              >
                {activeIcon}
              </LinearGradient>
            </View>
          </Animated.View>
        ) : null}

        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;

          const { options } = descriptor;
          const isFocused = state.index === index;
          const label =
            typeof options.title === 'string' ? options.title : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
              style={styles.tab}
            >
              {/* El ícono del elemento activo lo dibuja la burbuja, así que
                  aquí se oculta para no verlo duplicado. */}
              <View style={[styles.icon, isFocused && styles.iconHidden]}>
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color: colors.textMuted,
                  size: 22,
                })}
              </View>

              <Animated.Text
                numberOfLines={1}
                style={[styles.label, isFocused ? styles.labelActive : styles.labelIdle]}
              >
                {label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: BAR_MARGIN,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingBottom: spacing.sm,
    // La burbuja sobresale por arriba, así que la barra no puede recortar.
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.5,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      default: { elevation: 12 },
    }),
  },
  bubbleTrack: {
    position: 'absolute',
    top: -BUBBLE_RAISE,
    left: 0,
    alignItems: 'center',
  },
  bubbleShadow: {
    borderRadius: radius.pill,
    // Anillo del color del fondo: separa visualmente la burbuja de la barra.
    borderWidth: 4,
    borderColor: colors.background,
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOpacity: 0.45,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      default: { elevation: 8 },
    }),
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  icon: {
    height: 22,
    justifyContent: 'center',
  },
  iconHidden: {
    opacity: 0,
  },
  label: {
    fontSize: typography.micro.fontSize,
    lineHeight: typography.micro.lineHeight,
  },
  labelIdle: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
