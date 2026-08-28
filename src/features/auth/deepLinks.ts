import * as Linking from 'expo-linking';

/**
 * Enlaces profundos de autenticacion.
 *
 * Todo lo que sale de Launchpad y tiene que volver --el navegador de Google,
 * el correo de recuperacion-- regresa por una de estas rutas. Se declaran aqui
 * y no escritas a mano en cada pantalla porque las mismas URLs hay que darlas
 * de alta en el panel de Supabase: si se escribieran en dos sitios, tarde o
 * temprano dejarian de coincidir y el fallo aparece en produccion, no al
 * compilar.
 *
 * ---------------------------------------------------------------------------
 * QUE URL SE GENERA EN CADA ENTORNO
 *
 * `Linking.createURL()` no inventa nada: usa el `scheme` de `app.json`
 * ("launchpad") cuando la app corre por si misma, y el tunel de Metro cuando
 * corre dentro de Expo Go.
 *
 *   Expo Go            exp://192.168.1.20:8081/--/auth/callback
 *   Development build  launchpad://auth/callback
 *   Produccion         launchpad://auth/callback
 *
 * La direccion IP de Expo Go cambia de red en red, asi que en el panel de
 * Supabase (Authentication -> URL Configuration -> Redirect URLs) hacen falta
 * las dos formas:
 *
 *   launchpad://**
 *   exp://**
 *
 * El comodin `exp://**` solo tiene sentido mientras se prueba en Expo Go.
 * Antes de publicar, quitalo: cualquier proyecto de Expo Go podria recibir el
 * callback.
 * ---------------------------------------------------------------------------
 */

/**
 * Vuelta de Google. La consume `openAuthSessionAsync` dentro del propio flujo,
 * asi que esta ruta no necesita una pantalla.
 */
export const AUTH_CALLBACK_PATH = 'auth/callback';

/**
 * Vuelta del correo de recuperacion. Esta SI abre una pantalla, y por eso usa
 * una ruta distinta de la de Google: asi el escuchador de enlaces puede
 * distinguir un caso del otro sin adivinar.
 */
export const PASSWORD_RESET_PATH = 'auth/reset-password';

/**
 * Vuelta del correo de confirmacion de cuenta. Tambien trae un codigo que se
 * canjea por una sesion, asi que confirmar el correo desde el telefono deja al
 * usuario dentro sin tener que escribir la contraseña otra vez.
 */
export const EMAIL_CONFIRM_PATH = 'auth/confirm';

export function createAuthRedirectUrl(path: string): string {
  return Linking.createURL(path);
}

/**
 * Ruta de un enlace entrante, normalizada.
 *
 * Hace falta porque los dos entornos parten la URL de forma distinta:
 *
 *   launchpad://auth/reset-password        -> hostname 'auth', path 'reset-password'
 *   exp://192.168.1.20:8081/--/auth/...    -> hostname '192.168...', path 'auth/reset-password'
 *
 * Uniendo las dos piezas y comparando por el final, la misma comprobacion vale
 * en los dos casos.
 */
export function matchesPath(url: string, expected: string): boolean {
  const parsed = Linking.parse(url);
  const joined = [parsed.hostname, parsed.path].filter(Boolean).join('/');
  return joined.replace(/^\/+|\/+$/g, '').endsWith(expected);
}

/** Resultado de leer un enlace de vuelta de Supabase. */
export type AuthCallback =
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string }
  | { kind: 'unknown' };

/**
 * Lee lo que Supabase adjunto al enlace de vuelta.
 *
 * Con `flowType: 'pkce'` lo que llega es `?code=...`: un codigo de un solo uso
 * que hay que canjear por una sesion. Si el usuario cancelo o el proveedor
 * fallo, llega `?error=...&error_description=...` en su lugar.
 */
export function readAuthCallback(url: string): AuthCallback {
  const { queryParams } = Linking.parse(url);
  if (!queryParams) return { kind: 'unknown' };

  const code = queryParams.code;
  if (typeof code === 'string' && code.length > 0) {
    return { kind: 'code', code };
  }

  const error = queryParams.error ?? queryParams.error_code;
  if (typeof error === 'string' && error.length > 0) {
    const description = queryParams.error_description;

    // `access_denied` es el usuario cerrando la pantalla de Google. No es un
    // fallo y no merece una alerta roja.
    if (error === 'access_denied') {
      return { kind: 'error', message: 'Cancelaste el inicio de sesión.' };
    }

    // Caducado o ya usado: es el caso mas comun con los enlaces de correo.
    if (error === 'otp_expired' || String(description).includes('expired')) {
      return {
        kind: 'error',
        message: 'Ese enlace ya caducó o se usó. Pide uno nuevo desde la pantalla de acceso.',
      };
    }

    console.error('[Launchpad] Callback de Auth con error:', error, description);
    return { kind: 'error', message: 'No pudimos completar el proceso. Inténtalo de nuevo.' };
  }

  return { kind: 'unknown' };
}
