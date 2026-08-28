/**
 * Claves de la tabla `settings` (almacén clave/valor local).
 *
 * Se centralizan aquí para que no aparezcan strings sueltos por el código.
 *
 * Todo lo que hay en esta tabla pertenece al DISPOSITIVO, no a la cuenta: la
 * moneda elegida, si ya viste el saludo de PAD, si los datos que había en este
 * teléfono ya se subieron. Los datos del usuario viven en Supabase.
 *
 * El nombre del usuario es un caso intermedio: la fuente de verdad es
 * `profiles.display_name`, y aquí se guarda una copia para que el dashboard
 * pueda saludar en el primer fotograma, sin esperar a la red.
 */
export const SETTING_KEYS = {
  userName: 'user.name',
  currency: 'app.currency',

  /**
   * UUID del usuario que ya vio el saludo animado de PAD.
   *
   * Se guarda el identificador y no un booleano para que el saludo vuelva a
   * aparecer si entra otra cuenta en este teléfono —o la misma tras
   * reinstalar—, que es justo cuando tiene sentido.
   */
  welcomeSeenFor: 'welcome.seenFor',

  /**
   * UUID del usuario al que se le subieron los datos que había en este
   * teléfono antes de existir las cuentas.
   *
   * Se guarda el identificador, otra vez, para que una segunda cuenta que
   * entre en este mismo dispositivo NO herede los datos de la primera: eso
   * sería una fuga entre cuentas. El valor `'none'` significa que se comprobó
   * y no había nada que subir.
   */
  localImportDoneFor: 'migration.localImportedFor',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** Marca de "se comprobó y no había datos locales que subir". */
export const NO_LOCAL_IMPORT = 'none';

export const DEFAULT_CURRENCY = 'BOB';

/** Monedas ofrecidas en Configuración. */
export const AVAILABLE_CURRENCIES = ['BOB', 'USD', 'EUR'] as const;
