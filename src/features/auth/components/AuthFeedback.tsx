import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export interface AuthFeedbackProps {
  /** Qué está pasando ahora mismo: "Iniciando sesión…". */
  loading?: string | null;
  /** Algo salió mal. Ya traducido: aquí no llegan mensajes de Supabase. */
  error?: string | null;
  /** Salió bien: "Cuenta creada correctamente.". */
  success?: string | null;
}

/**
 * Los tres estados de una pantalla de acceso, en un solo sitio.
 *
 * Se muestra solo uno a la vez y en este orden: si algo esta cargando, eso es
 * lo unico que importa; un error tapa a un exito anterior porque es mas
 * reciente.
 *
 * Ocupa sitio unicamente cuando hay algo que decir: un hueco reservado
 * permanentemente separaria el boton del formulario sin motivo.
 */
export function AuthFeedback({ loading, error, success }: AuthFeedbackProps) {
  if (loading) {
    return (
      <View style={[styles.box, styles.neutral]}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text variant="caption" tone="secondary" style={styles.text}>
          {loading}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.box, styles.danger]} accessibilityLiveRegion="polite">
        <Ionicons name="alert-circle" size={17} color={colors.danger} />
        <Text variant="caption" tone="danger" style={styles.text}>
          {error}
        </Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.box, styles.ok]} accessibilityLiveRegion="polite">
        <Ionicons name="checkmark-circle" size={17} color={colors.success} />
        <Text variant="caption" tone="success" style={styles.text}>
          {success}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  neutral: {
    backgroundColor: colors.neutralSoft,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
  ok: {
    backgroundColor: colors.successSoft,
  },
  text: {
    flexShrink: 1,
  },
});
