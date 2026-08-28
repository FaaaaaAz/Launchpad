import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { MASCOT_NAME, logo, mascot } from '@/constants';
import { AuthLink } from '@/features/auth/components/AuthLink';
import { colors, radius, spacing } from '@/theme';

/** El manifiesto de la app, una línea por idea. */
const MANIFESTO = ['Organiza tu vida.', 'Define tus objetivos.', 'Empieza a avanzar.'];

/**
 * Bienvenida.
 *
 * Es la primera pantalla que ve alguien que abre Launchpad sin sesión, y su
 * trabajo no es pedir datos sino explicar qué es esto. Por eso el formulario
 * está a un toque de distancia y no aquí: preguntar el correo antes de decir
 * para qué sirve la app es pedir confianza sin haberla ganado.
 *
 * Sustituye al antiguo `onboarding.tsx`, que cumplía este papel cuando la app
 * era solo local y el «registro» consistía en escribir un nombre. Ese nombre
 * ahora llega con la cuenta.
 */
export default function WelcomeScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.mascotWrap}>
            {/*
              Halo del amarillo de marca al 16 % detrás de PAD. Sobre negro, un
              degradado dejaba una banda visible donde terminaba; un círculo
              plano separa la ilustración del fondo sin dibujar ningún borde.
            */}
            <View style={styles.halo} />
            <Image
              source={mascot.welcome}
              style={styles.mascot}
              resizeMode="contain"
              accessible={false}
            />
          </View>

          <View style={styles.brand}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text variant="display" style={styles.wordmark}>
              LAUNCHPAD
            </Text>
            <Text variant="body" tone="secondary" style={styles.centered}>
              Tu plataforma de lanzamiento. Con {MASCOT_NAME} de copiloto.
            </Text>
          </View>
        </View>

        <View style={styles.manifesto}>
          {MANIFESTO.map((line, index) => (
            <Text
              key={line}
              variant="title"
              color={index === MANIFESTO.length - 1 ? colors.accent : colors.textPrimary}
            >
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            label="Comenzar"
            onPress={() => router.push('/register')}
            fullWidth
            size="large"
            icon="rocket-outline"
          />

          <AuthLink
            question="¿Ya tienes una cuenta?"
            label="Iniciar sesión"
            onPress={() => router.push('/login')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  mascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  mascot: {
    width: 232,
    height: 232,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  wordmark: {
    letterSpacing: 4,
  },
  centered: {
    textAlign: 'center',
  },
  manifesto: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.xl,
  },
});
