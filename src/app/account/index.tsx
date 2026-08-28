import { router } from 'expo-router';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  Text,
} from '@/components/ui';
import { MASCOT_NAME } from '@/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthFeedback } from '@/features/auth/components/AuthFeedback';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { colors, radius, spacing } from '@/theme';
import { formatDateLong, toDateOnly } from '@/utils/date';

/** Cómo se llama cada proveedor de acceso en la interfaz. */
const PROVIDER_LABELS: Record<string, string> = {
  email: 'Correo y contraseña',
  google: 'Google',
};

/**
 * Mi cuenta.
 *
 * Reúne lo que antes no existía: quién eres para Launchpad, cómo entras y cómo
 * te vas. Lo que se muestra sale de dos sitios distintos y conviene no
 * mezclarlos: el correo, la fecha de alta y los proveedores los administra
 * Supabase Auth; el nombre y el avatar viven en `profiles`.
 */
export default function AccountScreen() {
  const { user, profile, providers, hasPassword, signOut } = useAuth();

  const displayName = profile?.displayName?.trim() ?? '';
  const email = user?.email ?? '';
  const avatarUrl = profile?.avatarUrl ?? null;

  // Google devuelve una URL https; una futura foto propia será una clave de
  // Storage. Se distingue por el prefijo para no intentar cargar una clave
  // como si fuera una dirección web.
  const hasRemoteAvatar = avatarUrl !== null && avatarUrl.startsWith('http');

  const initials = (displayName || email || MASCOT_NAME).slice(0, 1).toUpperCase();

  const createdAt = user?.created_at
    ? formatDateLong(toDateOnly(new Date(user.created_at)))
    : null;

  const logout = useAsyncAction(async () => {
    await signOut();
    // No se navega: al desaparecer la sesión, el layout raíz sustituye la
    // pila de la app por la de acceso.
  });

  const confirmSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      'Tus datos se quedan guardados en tu cuenta. Podrás volver a entrar cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => void logout.run(),
        },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Mi cuenta" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.identity}>
          <View style={styles.avatar}>
            {hasRemoteAvatar ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text variant="display" color={colors.accent}>
                {initials}
              </Text>
            )}
          </View>

          <View style={styles.identityText}>
            <Text variant="title" numberOfLines={1}>
              {displayName || 'Sin nombre'}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {email}
            </Text>
          </View>

          <View style={styles.providerBadges}>
            {providers.map((provider) => (
              <Badge
                key={provider}
                label={PROVIDER_LABELS[provider] ?? provider}
                color={colors.accent}
                backgroundColor={colors.accentSoft}
                size="small"
              />
            ))}
          </View>
        </Card>

        <Card>
          <SectionHeader title="Datos de acceso" icon="key-outline" />

          <ListRow title="Correo" subtitle={email} icon="at-outline" />

          <View style={styles.divider} />

          <ListRow
            title="Método de acceso"
            subtitle={
              providers.length > 0
                ? providers.map((provider) => PROVIDER_LABELS[provider] ?? provider).join(' · ')
                : 'Sin determinar'
            }
            icon="shield-checkmark-outline"
          />

          {createdAt ? (
            <>
              <View style={styles.divider} />
              <ListRow title="Cuenta creada" subtitle={createdAt} icon="calendar-outline" />
            </>
          ) : null}
        </Card>

        <Card>
          <SectionHeader
            title="Perfil"
            icon="person-outline"
            subtitle={`Cómo te llama ${MASCOT_NAME} y cómo apareces en la app`}
          />

          <ListRow
            title="Editar perfil"
            subtitle="Nombre y apellidos"
            icon="create-outline"
            onPress={() => router.push('/account/edit')}
            showChevron
          />

          <View style={styles.divider} />

          {/*
            A quien entró solo con Google no se le ofrece cambiar una
            contraseña que nunca tuvo: el formulario fallaría o, peor, le
            crearía una sin que la pidiera. Se le explica en su lugar.
          */}
          {hasPassword ? (
            <ListRow
              title="Cambiar contraseña"
              subtitle="Necesitarás la actual"
              icon="lock-closed-outline"
              onPress={() => router.push('/account/password')}
              showChevron
            />
          ) : (
            <ListRow
              title="Contraseña"
              subtitle="Entras con Google, así que no hay ninguna que cambiar"
              icon="logo-google"
              iconColor={colors.textMuted}
            />
          )}
        </Card>

        <Card>
          <SectionHeader title="Sesión" icon="log-out-outline" />

          <Text variant="caption" tone="muted" style={styles.note}>
            Cerrar sesión no borra nada. Tus tareas, actividades y movimientos se quedan en tu
            cuenta y vuelven a aparecer en cuanto entres de nuevo, aquí o en otro teléfono.
          </Text>

          <AuthFeedback
            loading={logout.isRunning ? 'Cerrando sesión…' : null}
            error={logout.error}
          />

          <Button
            label="Cerrar sesión"
            onPress={confirmSignOut}
            loading={logout.isRunning}
            variant="danger"
            icon="log-out-outline"
            fullWidth
            style={styles.action}
          />
        </Card>

        <Button label="Volver" onPress={() => router.back()} variant="ghost" fullWidth />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  identity: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  identityText: {
    alignItems: 'center',
    gap: 2,
  },
  providerBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  note: {
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.md,
  },
});
