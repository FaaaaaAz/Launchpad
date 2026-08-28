import { useState } from 'react';

import { Button } from '@/components/ui';
import { PAD_AUTH_LINES, mascot } from '@/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthFeedback } from '@/features/auth/components/AuthFeedback';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '@/features/auth/validation';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { ValidationError } from '@/utils/errors';

/**
 * Contraseña nueva, tras abrir el enlace del correo.
 *
 * Vive en la raíz y no dentro de `(auth)` por una razón concreta: cuando el
 * usuario llega aquí YA tiene sesión. Canjear el código del enlace abre una
 * sesión válida, que es justamente lo que autoriza a cambiar la contraseña sin
 * conocer la anterior.
 *
 * Si esta pantalla viviera en el grupo de acceso —protegido por «no hay
 * sesión»— desaparecería del árbol de navegación en el mismo instante en que
 * se vuelve necesaria. El layout raíz la protege con `recoveryPending`, que es
 * la condición real.
 */
export default function ResetPasswordScreen() {
  const { updatePassword, completeRecovery, user } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const save = useAsyncAction(async () => {
    const errors = validateNewPassword({ password, confirmPassword });
    if (Object.keys(errors).length > 0) throw new ValidationError(errors);

    await updatePassword(password);

    // Cierra el paréntesis de la recuperación: el layout raíz vuelve a montar
    // la app y el usuario aterriza en el dashboard, ya dentro.
    completeRecovery();
  });

  return (
    <AuthLayout
      mascot={mascot.study}
      eyebrow="Último paso"
      title="Elige tu contraseña"
      subtitle={
        user?.email
          ? `Estás cambiando la contraseña de ${user.email}.`
          : 'Escribe la contraseña con la que entrarás a partir de ahora.'
      }
      padLine={PAD_AUTH_LINES.newPassword}
    >
      <PasswordField
        label="Contraseña nueva"
        value={password}
        onChangeText={setPassword}
        placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
        error={save.fieldErrors.password}
        variant="new"
      />

      <PasswordField
        label="Confirmar contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Repite la contraseña"
        error={save.fieldErrors.confirmPassword}
        variant="new"
        returnKeyType="go"
        onSubmitEditing={() => void save.run()}
      />

      <AuthFeedback
        loading={save.isRunning ? 'Guardando contraseña…' : null}
        error={save.error}
      />

      <Button
        label="Guardar y entrar"
        onPress={() => void save.run()}
        loading={save.isRunning}
        fullWidth
        size="large"
        icon="lock-closed-outline"
      />
    </AuthLayout>
  );
}
