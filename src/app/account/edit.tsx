import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { TextField } from '@/components/form';
import { Button, Text } from '@/components/ui';
import { MASCOT_NAME } from '@/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthFeedback } from '@/features/auth/components/AuthFeedback';
import { MAX_NAME_LENGTH } from '@/features/auth/validation';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { spacing } from '@/theme';
import { ValidationError } from '@/utils/errors';

/**
 * Editar perfil.
 *
 * Solo toca `profiles`. El correo no se edita aquí a propósito: cambiarlo es
 * una operación de Auth que exige confirmar la dirección nueva, y mezclarla
 * con «editar mi nombre» haría que un formulario aparentemente inocuo pudiera
 * dejar a alguien sin acceso a su cuenta.
 */
export default function EditProfileScreen() {
  const { profile, updateProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');

  const save = useAsyncAction(async () => {
    const trimmed = displayName.trim();

    if (!trimmed) {
      throw new ValidationError({ displayName: `Dile a ${MASCOT_NAME} cómo llamarte.` });
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new ValidationError({ displayName: `Máximo ${MAX_NAME_LENGTH} caracteres.` });
    }

    await updateProfile({
      displayName: trimmed,
      // Vacío se guarda como NULL, no como cadena vacía: en la base, «no lo sé»
      // y «está en blanco» no son lo mismo.
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
    });

    router.back();
  });

  return (
    <FormScreen title="Editar perfil" subtitle="Así te ve Launchpad">
      <View style={styles.form}>
        <TextField
          label="Nombre para saludarte"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Tu nombre"
          hint={`Es el que usa ${MASCOT_NAME} en el inicio.`}
          error={save.fieldErrors.displayName}
          autoCapitalize="words"
          maxLength={MAX_NAME_LENGTH}
          required
        />

        <TextField
          label="Nombre"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Opcional"
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          maxLength={MAX_NAME_LENGTH}
        />

        <TextField
          label="Apellidos"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Opcional"
          autoCapitalize="words"
          autoComplete="family-name"
          textContentType="familyName"
          maxLength={MAX_NAME_LENGTH}
        />

        <Text variant="caption" tone="muted">
          Para cambiar tu correo electrónico, escríbenos desde la cuenta: es una operación que
          necesita confirmar la dirección nueva antes de aplicarse.
        </Text>

        <AuthFeedback loading={save.isRunning ? 'Guardando…' : null} error={save.error} />

        <Button
          label="Guardar cambios"
          onPress={() => void save.run()}
          loading={save.isRunning}
          fullWidth
          size="large"
        />

        <Button
          label="Cancelar"
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
