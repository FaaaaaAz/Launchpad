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
import { colors, motion, spacing } from '@/theme';

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
        {/* La imagen tiene fondo transparente, así que se dibuja tal cual.
            No lleva ningún degradado encima: superponerle uno creaba una
            banda oscura visible a media pantalla. */}
        <Image source={mascot.welcome} style={styles.mascot} resizeMode="contain" />
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
    // Sobresale un poco por la derecha: da sensación de que el zorro entra
    // en escena en lugar de estar pegado al borde.
    right: -20,
    bottom: 0,
    width: '94%',
    // La proporción del contenedor iguala la de la imagen, así `contain` la
    // dibuja sin dejar franjas vacías arriba y abajo.
    aspectRatio: 1024 / 1536,
  },
  mascot: {
    width: '100%',
    height: '100%',
  },
  textLayer: {
    position: 'absolute',
    left: spacing.xxl,
    right: spacing.xxl,
    top: '10%',
    gap: spacing.sm,
  },
  greeting: {
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: spacing.xs,
    maxWidth: '70%',
  },
  hint: {
    marginTop: spacing.xxl,
  },
});
