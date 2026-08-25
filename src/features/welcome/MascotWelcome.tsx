import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Text } from '@/components/ui';
import { mascot } from '@/constants';
import { colors, gradients, motion, spacing } from '@/theme';

export interface MascotWelcomeProps {
  userName: string;
  /** Se llama cuando la animación de salida termina. */
  onDismiss: () => void;
}

const ENTER_DELAY = 120;
const TEXT_DELAY = 380;

/**
 * Bienvenida con la mascota, superpuesta sobre el dashboard.
 *
 * Se monta por encima de toda la navegación (desde el layout raíz) y no dentro
 * del Home: si viviera dentro de la pantalla, la barra de pestañas quedaría
 * por encima y se vería iluminada mientras el resto está atenuado.
 *
 * Todas las animaciones usan driver nativo, así que la entrada del zorro no se
 * entrecorta aunque el dashboard esté cargando datos por detrás.
 */
export function MascotWelcome({ userName, onDismiss }: MascotWelcomeProps) {
  const { width } = useWindowDimensions();

  const scrim = useRef(new Animated.Value(0)).current;
  const mascotX = useRef(new Animated.Value(width)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(24)).current;
  const isLeaving = useRef(false);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(ENTER_DELAY),
      Animated.parallel([
        Animated.timing(scrim, {
          toValue: 1,
          duration: motion.slow,
          useNativeDriver: true,
        }),
        // Muelle suave: entra con decisión pero sin rebotar como un juguete.
        Animated.spring(mascotX, {
          toValue: 0,
          speed: 10,
          bounciness: 6,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(TEXT_DELAY),
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: motion.slow,
              useNativeDriver: true,
            }),
            Animated.timing(textY, {
              toValue: 0,
              duration: motion.slow,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
    ]).start();
  }, [scrim, mascotX, textOpacity, textY]);

  const leave = useCallback(() => {
    // Sin este guardia, tocar dos veces rápido lanzaría la salida dos veces y
    // `onDismiss` correría duplicado.
    if (isLeaving.current) return;
    isLeaving.current = true;

    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: motion.fast,
        useNativeDriver: true,
      }),
      Animated.timing(mascotX, {
        toValue: width,
        duration: motion.slow,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scrim, {
        toValue: 0,
        duration: motion.slow,
        delay: motion.fast,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onDismiss();
    });
  }, [mascotX, scrim, textOpacity, onDismiss, width]);

  const greeting = userName ? `Hola, ${userName}` : 'Hola';

  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={leave}
      accessibilityRole="button"
      accessibilityLabel="Continuar al inicio"
    >
      <Animated.View style={[styles.scrim, { opacity: scrim }]} />

      <Animated.View
        style={[styles.mascotLayer, { transform: [{ translateX: mascotX }] }]}
        pointerEvents="none"
      >
        <Image source={mascot.welcome} style={styles.mascot} resizeMode="contain" />

        {/* La imagen trae fondo propio. Estos degradados difuminan sus bordes
            contra el fondo de la app para que el zorro no se vea recortado
            dentro de un rectángulo. */}
        <LinearGradient
          colors={gradients.fadeToBackground}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={styles.fadeLeft}
          pointerEvents="none"
        />
        <LinearGradient
          colors={gradients.fadeToBackground}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.fadeTop}
          pointerEvents="none"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.textLayer,
          { opacity: textOpacity, transform: [{ translateY: textY }] },
        ]}
        pointerEvents="none"
      >
        <Text variant="caption" tone="muted" uppercase>
          Bienvenido a Launchpad
        </Text>

        <Text variant="display" style={styles.greeting}>
          {greeting}
        </Text>

        <Text variant="body" tone="secondary" style={styles.subtitle}>
          Soy tu copiloto. Desde aquí llevamos tus tareas, tus entrenamientos y
          todo lo que quieras mantener bajo control.
        </Text>

        <View style={styles.hint}>
          <Text variant="caption" color={colors.accent}>
            Toca para comenzar
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayDeep,
  },
  mascotLayer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '86%',
    height: '72%',
  },
  mascot: {
    width: '100%',
    height: '100%',
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '45%',
  },
  fadeTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '30%',
  },
  textLayer: {
    position: 'absolute',
    left: spacing.xxl,
    right: spacing.xxl,
    top: '14%',
    gap: spacing.sm,
  },
  greeting: {
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: spacing.xs,
    maxWidth: '78%',
  },
  hint: {
    marginTop: spacing.xxl,
  },
});
