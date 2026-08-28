import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { TextField } from '@/components/form';
import { colors, HIT_SLOP } from '@/theme';

export interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  /**
   * Qué contraseña es, para el llavero del teléfono.
   *
   * Importa mas de lo que parece: con 'current' iOS ofrece la guardada, y con
   * 'new' propone una fuerte y se ofrece a guardarla. Marcar mal esto hace que
   * el llavero sugiera cosas absurdas y la gente deje de usarlo.
   */
  variant?: 'current' | 'new';
  returnKeyType?: 'done' | 'next' | 'go';
  onSubmitEditing?: () => void;
}

/**
 * Campo de contraseña con mostrar/ocultar.
 *
 * Empieza oculto, como debe ser. El ojo existe porque escribir una contraseña
 * a ciegas en un teclado de movil es la principal causa de un "correo o
 * contraseña incorrectos" que en realidad era una errata.
 */
export function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  variant = 'current',
  returnKeyType,
  onSubmitEditing,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      hint={hint}
      error={error}
      secureTextEntry={!isVisible}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={variant === 'new' ? 'new-password' : 'current-password'}
      textContentType={variant === 'new' ? 'newPassword' : 'password'}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      trailing={
        <Pressable
          onPress={() => setIsVisible((previous) => !previous)}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          style={styles.toggle}
        >
          <Ionicons
            name={isVisible ? 'eye-off-outline' : 'eye-outline'}
            size={19}
            color={colors.textMuted}
          />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    paddingLeft: 4,
  },
});
