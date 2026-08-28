import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';
import type { ReactNode } from 'react';

import { colors, radius, spacing, typography } from '@/theme';

import { Text } from '../ui/Text';
import { FieldShell } from './FieldShell';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  /** Texto fijo delante del input, por ejemplo el símbolo de la moneda. */
  prefix?: string;
  autoFocus?: boolean;

  /* --- Campos de acceso -------------------------------------------------
   * Todo lo de aquí abajo es opcional y no cambia el comportamiento de los
   * formularios que ya existían. Hace falta para el correo y la contraseña:
   * sin `textContentType` ni `autoComplete`, iOS no ofrece el llavero y el
   * usuario tiene que teclear la contraseña a mano cada vez.
   */

  /** Oculta el texto. La alterna `PasswordField`, no se toca a mano. */
  secureTextEntry?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  autoCorrect?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  /** Control a la derecha dentro del campo: el ojo de mostrar/ocultar. */
  trailing?: ReactNode;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  required = false,
  multiline = false,
  maxLength,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  prefix,
  autoFocus = false,
  secureTextEntry = false,
  autoComplete,
  textContentType,
  autoCorrect,
  returnKeyType,
  onSubmitEditing,
  trailing,
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <View
        style={[
          styles.inputRow,
          multiline && styles.multilineRow,
          isFocused && styles.focused,
          Boolean(error) && styles.errored,
        ]}
      >
        {prefix ? (
          <Text variant="body" tone="muted">
            {prefix}
          </Text>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          multiline={multiline}
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoFocus={autoFocus}
          secureTextEntry={secureTextEntry}
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, multiline && styles.multilineInput]}
          // El cursor y la selección heredan el acento de la app.
          selectionColor={colors.accent}
        />

        {trailing}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg - 2,
    minHeight: 48,
  },
  multilineRow: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    minHeight: 96,
  },
  focused: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.surfacePressed,
  },
  errored: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    paddingVertical: spacing.md,
  },
  multilineInput: {
    paddingTop: 0,
    textAlignVertical: 'top',
    minHeight: 72,
  },
});
