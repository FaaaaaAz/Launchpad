/**
 * Claves de la tabla `settings` (almacén clave/valor local).
 *
 * Se centralizan aquí para que no aparezcan strings sueltos por el código y
 * para poder migrarlas de golpe si algún día viven en el perfil del usuario.
 */
export const SETTING_KEYS = {
  onboardingCompleted: 'onboarding.completed',
  /** Queda pendiente la bienvenida de la mascota tras el onboarding. */
  welcomePending: 'welcome.pending',
  userName: 'user.name',
  currency: 'app.currency',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export const DEFAULT_CURRENCY = 'BOB';

/** Monedas ofrecidas en Configuración. */
export const AVAILABLE_CURRENCIES = ['BOB', 'USD', 'EUR'] as const;
