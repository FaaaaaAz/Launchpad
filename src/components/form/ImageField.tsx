import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { useImagePicker } from '@/hooks/useImagePicker';
import { imageStorage } from '@/services/imageStorage';
import { colors, radius, spacing } from '@/theme';

import { IconButton } from '../ui/IconButton';
import { PressableScale } from '../ui/PressableScale';
import { InlineError } from '../ui/States';
import { Text } from '../ui/Text';
import { FieldShell } from './FieldShell';

export interface ImageFieldProps {
  label: string;
  /** Clave de almacenamiento, no una URI. */
  value: string | null;
  onChange: (value: string | null) => void;
  hint?: string;
  accentColor?: string;
}

/** Selector de la imagen de portada de una actividad. */
export function ImageField({
  label,
  value,
  onChange,
  hint,
  accentColor = colors.accent,
}: ImageFieldProps) {
  const { pickImage, isPicking, error } = useImagePicker();
  const uri = imageStorage.resolve(value);

  const handlePick = async () => {
    const key = await pickImage();
    if (key) onChange(key);
  };

  return (
    <FieldShell label={label} hint={hint}>
      <PressableScale
        onPress={() => void handlePick()}
        disabled={isPicking}
        accessibilityRole="button"
        accessibilityLabel={uri ? 'Cambiar imagen' : 'Elegir una imagen'}
        style={styles.frame}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            {isPicking ? (
              <ActivityIndicator color={accentColor} />
            ) : (
              <>
                <Ionicons name="image-outline" size={24} color={accentColor} />
                <Text variant="caption" tone="muted">
                  Toca para elegir una foto
                </Text>
              </>
            )}
          </View>
        )}

        {uri ? (
          <IconButton
            icon="close"
            accessibilityLabel="Quitar imagen"
            onPress={() => onChange(null)}
            size={32}
            backgroundColor={colors.overlay}
            color={colors.textPrimary}
            style={styles.remove}
          />
        ) : null}
      </PressableScale>

      {error ? <InlineError message={error} /> : null}
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 160,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  remove: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    borderColor: 'transparent',
  },
});
