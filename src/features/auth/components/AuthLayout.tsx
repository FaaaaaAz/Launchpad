import { Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import type { ReactNode } from 'react';

import { Screen, Text } from '@/components/ui';
import { MASCOT_NAME, logo } from '@/constants';
import { colors, radius, spacing } from '@/theme';

export interface AuthLayoutProps {
  /** Ilustración de PAD que acompaña a esta pantalla. */
  mascot: ImageSourcePropType;
  /** Etiqueta pequeña sobre el título. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Frase de PAD, en su burbuja. */
  padLine?: string;
  /** Formulario o contenido principal. */
  children: ReactNode;
  /** Enlaces del final: «¿No tienes cuenta?», etc. */
  footer?: ReactNode;
}

/**
 * Estructura común de las pantallas de acceso.
 *
 * Existe para que Login, Registro y las de contraseña se sientan la misma app
 * y no tres formularios parecidos. Todo lo que se repite —el logo, PAD, el
 * manejo del teclado, los márgenes— vive aquí una sola vez.
 *
 * La bienvenida NO la usa: es una pantalla de presentación, no un formulario,
 * y forzarla dentro de esta estructura habría obligado a llenar el componente
 * de excepciones para un único caso.
 *
 * Sobre el teclado: se usa `automaticallyAdjustKeyboardInsets` igual que en
 * `FormScreen`. Un `KeyboardAvoidingView` envolviendo un ScrollView solo lo
 * encoge, y el campo enfocado —que en un login es justo el último— se queda
 * igualmente debajo del teclado.
 */
export function AuthLayout({
  mascot,
  eyebrow,
  title,
  subtitle,
  padLine,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text variant="caption" tone="muted" uppercase style={styles.wordmark}>
              Launchpad
            </Text>
          </View>

          <View style={styles.mascotWrap}>
            {/*
              Halo detrás de PAD: un círculo con el amarillo de marca al 16 %,
              no un degradado. Sobre negro, un degradado dejaba una banda
              visible donde terminaba; esto separa la ilustración del fondo sin
              dibujar ningún borde.
            */}
            <View style={styles.halo} />
            <Image
              source={mascot}
              style={styles.mascotImage}
              resizeMode="contain"
              accessible={false}
            />
          </View>

          <View style={styles.titles}>
            {eyebrow ? (
              <Text variant="micro" tone="accent" uppercase>
                {eyebrow}
              </Text>
            ) : null}

            <Text variant="display" style={styles.title}>
              {title}
            </Text>

            {subtitle ? (
              <Text variant="body" tone="secondary">
                {subtitle}
              </Text>
            ) : null}
          </View>

          {padLine ? (
            <View style={styles.bubble}>
              <Text variant="micro" tone="muted" uppercase>
                {MASCOT_NAME} dice
              </Text>
              <Text variant="bodyStrong" style={styles.bubbleLine}>
                {padLine}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    // Aire al final para que el último campo pueda subir por encima del
    // teclado en vez de quedarse pegado al borde.
    paddingBottom: spacing.huge * 2,
    gap: spacing.xxl,
  },
  header: {
    gap: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
  },
  wordmark: {
    letterSpacing: 2.4,
  },
  mascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  halo: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  mascotImage: {
    width: 116,
    height: 116,
  },
  titles: {
    gap: spacing.xs,
  },
  title: {
    letterSpacing: -0.5,
  },
  bubble: {
    gap: 2,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentBorder,
    padding: spacing.md,
  },
  bubbleLine: {
    lineHeight: 20,
  },
  body: {
    gap: spacing.lg,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
});
