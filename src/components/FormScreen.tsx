import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
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
 * Resuelve de una vez el teclado que tapa los campos, el desplazamiento y el
 * encabezado, para que cada formulario solo se ocupe de sus campos.
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
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
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge * 2,
  },
});
