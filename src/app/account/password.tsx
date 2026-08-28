import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Button, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { verifyCurrentPassword } from '@/features/auth/authService';
import { AuthFeedback } from '@/features/auth/components/AuthFeedback';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '@/features/auth/validation';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { spacing } from '@/theme';
import { AppError, ValidationError } from '@/utils/errors';

/**
 * Cambiar contraseña estando dentro.
 *
 * Pide la actual aunque Supabase no la exija. La razón está en
 * `verifyCurrentPassword`: sin ese paso, un teléfono desbloqueado bastaría
 * para quedarse con la cuenta de alguien.
 *
 * A esta pantalla solo se llega si la cuenta tiene contraseña. Quien entra
 * únicamente con Google ve una explicación en «Mi cuenta» y ningún formulario:
 * un campo de «contraseña actual» que no existe no tiene respuesta correcta.
 */
export default function ChangePasswordScreen() {
  const { user, hasPassword, updatePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saved, setSaved] = useState(false);

  const save = useAsyncAction(async () => {
    if (!currentPassword) {
      throw new ValidationError({ currentPassword: 'Escribe tu contraseña actual.' });
    }

    const errors = validateNewPassword({ password, confirmPassword });
    if (Object.keys(errors).length > 0) throw new ValidationError(errors);

    if (currentPassword === password) {
      throw new ValidationError({
        password: 'La contraseña nueva tiene que ser distinta de la actual.',
      });
    }

    const email = user?.email;
    if (!email) throw new AppError('No pudimos identificar tu cuenta.', 'no_email');

    await verifyCurrentPassword(email, currentPassword);
    await updatePassword(password);

    setSaved(true);
    setCurrentPassword('');
    setPassword('');
    setConfirmPassword('');
  });

  /**
   * Salvaguarda por si se llegara aquí por un enlace directo. La navegación ya
   * no ofrece esta pantalla a las cuentas sin contraseña, pero una ruta
   * accesible por URL merece defenderse por sí misma.
   */
  if (!hasPassword) {
    return (
      <FormScreen title="Contraseña" subtitle="Entras con Google">
        <View style={styles.form}>
          <Text variant="body" tone="secondary">
            Tu cuenta usa Google para entrar, así que no tiene ninguna contraseña de Launchpad
            que cambiar. Tu contraseña la administras desde tu cuenta de Google.
          </Text>

          <Button label="Volver" onPress={() => router.back()} fullWidth size="large" />
        </View>
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Cambiar contraseña" subtitle={user?.email ?? undefined}>
      <View style={styles.form}>
        <PasswordField
          label="Contraseña actual"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="La que usas ahora"
          error={save.fieldErrors.currentPassword}
          variant="current"
        />

        <PasswordField
          label="Contraseña nueva"
          value={password}
          onChangeText={setPassword}
          placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
          error={save.fieldErrors.password}
          variant="new"
        />

        <PasswordField
          label="Confirmar contraseña nueva"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repite la contraseña nueva"
          error={save.fieldErrors.confirmPassword}
          variant="new"
          returnKeyType="done"
          onSubmitEditing={() => void save.run()}
        />

        <AuthFeedback
          loading={save.isRunning ? 'Guardando contraseña…' : null}
          error={save.error}
          success={saved ? 'Contraseña cambiada correctamente.' : null}
        />

        <Button
          label="Guardar contraseña"
          onPress={() => void save.run()}
          loading={save.isRunning}
          fullWidth
          size="large"
          icon="lock-closed-outline"
        />

        <Button
          label={saved ? 'Volver' : 'Cancelar'}
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
          disabled={save.isRunning}
        />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
});
