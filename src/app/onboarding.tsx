import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/form';
import { Button, Screen, Text } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useSettings } from '@/providers/SettingsProvider';
import { colors, spacing } from '@/theme';

/**
 * Bienvenida.
 *
 * No hay cuenta, contraseña ni correo: solo un nombre opcional para
 * personalizar el saludo. Cuando llegue la autenticación, esta pantalla es el
 * lugar natural donde añadirla sin tocar el resto de la app.
 */
export default function OnboardingScreen() {
  const { completeOnboarding } = useSettings();
  const [name, setName] = useState('');

  const start = useAsyncAction(async () => {
    await completeOnboarding(name);
  });

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text variant="display" style={styles.wordmark}>
              LAUNCHPAD
            </Text>

            <Text variant="body" tone="secondary">
              Tu plataforma de lanzamiento.
            </Text>

            <View style={styles.manifesto}>
              {['Organiza.', 'Avanza.', 'Construye.'].map((line, index) => (
                <Text
                  key={line}
                  variant="title"
                  color={index === 2 ? colors.accent : colors.textPrimary}
                >
                  {line}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.form}>
            <TextField
              label="¿Cómo te llamas?"
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              hint="Opcional. Solo se usa para saludarte y se guarda en tu teléfono."
              maxLength={40}
              autoCapitalize="words"
            />

            <Button
              label="Comenzar"
              onPress={() => void start.run()}
              loading={start.isRunning}
              fullWidth
              size="large"
              icon="rocket-outline"
            />
          </View>
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
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxl,
    gap: spacing.huge,
  },
  hero: {
    gap: spacing.md,
  },
  wordmark: {
    letterSpacing: 4,
  },
  manifesto: {
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
  form: {
    gap: spacing.xl,
  },
});
