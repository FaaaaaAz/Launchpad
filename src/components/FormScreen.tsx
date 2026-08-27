import { Platform, ScrollView, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';

import { Screen, ScreenHeader } from '@/components/ui';
import type { IconName } from '@/constants';
import { spacing } from '@/theme';

export interface FormScreenProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  backIcon?: IconName;
  children: ReactNode;
}

/**
 * Envoltorio de las pantallas de formulario.
 *
 * Sobre el teclado: se usa `automaticallyAdjustKeyboardInsets` en lugar de un
 * `KeyboardAvoidingView`. La diferencia importa: el KeyboardAvoidingView solo
 * encoge el contenedor, así que el campo enfocado podía quedar igualmente
 * debajo del teclado —justo lo que pasaba con el último campo del formulario—.
 * `automaticallyAdjustKeyboardInsets` ajusta los márgenes internos del
 * ScrollView y deja que iOS desplace el campo enfocado hasta hacerlo visible.
 *
 * En Android no hace falta: el sistema redimensiona la ventana por su cuenta
 * (`softwareKeyboardLayoutMode: resize`, el valor por defecto en Expo).
 */
export function FormScreen({
  title,
  subtitle,
  accentColor,
  backIcon = 'close',
  children,
}: FormScreenProps) {
  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        showBack
        backIcon={backIcon}
        accentColor={accentColor}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    // Aire al final para que el último campo pueda subir por encima del
    // teclado en lugar de quedarse pegado al borde.
    paddingBottom: spacing.huge * 2,
  },
});
