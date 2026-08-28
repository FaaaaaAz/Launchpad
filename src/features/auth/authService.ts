import type { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';
import { AppError, ValidationError } from '@/utils/errors';

import { toAuthError } from './authErrors';
import {
  AUTH_CALLBACK_PATH,
  EMAIL_CONFIRM_PATH,
  PASSWORD_RESET_PATH,
  createAuthRedirectUrl,
  readAuthCallback,
} from './deepLinks';
import { normalizeEmail } from './validation';

/**
 * Reglas de acceso.
 *
 * Es la unica capa que habla con `supabase.auth`. Las pantallas usan
 * `useAuth()`, que a su vez usa esto: asi la traduccion de errores, la
 * normalizacion del correo y el manejo del navegador de Google existen una
 * sola vez.
 *
 * Todo lo que sale de aqui lanza `AppError` con un mensaje ya presentable.
 * Ningun texto en ingles de Supabase llega a una pantalla.
 */

/* -------------------------------------------------------------------------- */
/* Correo y contraseña                                                        */
/* -------------------------------------------------------------------------- */

export async function signIn(email: string, password: string): Promise<Session> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (error) throw error;
    if (!data.session) throw new AppError('No pudimos iniciar sesión.', 'no_session');

    return data.session;
  } catch (cause) {
    throw toAuthError(cause, 'No pudimos iniciar sesión.');
  }
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignUpResult {
  /**
   * `true` cuando Supabase no devolvio sesion porque falta confirmar el
   * correo. Depende de un ajuste del proyecto (Authentication -> Providers ->
   * Email -> Confirm email), no del codigo, asi que la app contempla los dos
   * casos en lugar de dar por hecho uno.
   */
  needsEmailConfirmation: boolean;
  session: Session | null;
}

export async function signUp({ name, email, password }: SignUpInput): Promise<SignUpResult> {
  try {
    const trimmed = name.trim();

    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        /**
         * Estos datos van a `raw_user_meta_data` y de ahi los recoge el
         * trigger `handle_new_user` para crear el perfil. No se crea el perfil
         * desde el cliente porque una app que se cierra justo despues del
         * registro dejaria la cuenta a medias.
         */
        data: {
          display_name: trimmed,
          first_name: trimmed.split(' ')[0] ?? trimmed,
          last_name: trimmed.split(' ').slice(1).join(' ') || null,
        },
        emailRedirectTo: createAuthRedirectUrl(EMAIL_CONFIRM_PATH),
      },
    });

    if (error) throw error;

    /**
     * Correo ya registrado.
     *
     * Con la confirmacion de correo activada, Supabase NO devuelve un error en
     * este caso: responde con un usuario de aspecto normal pero con
     * `identities` vacio. Lo hace a proposito, para que nadie pueda usar el
     * formulario de registro como una lista de quien tiene cuenta.
     *
     * Aqui si se puede decir la verdad: quien escribe el correo en su propio
     * telefono normalmente es su dueño, y un "ya existe una cuenta" le ahorra
     * quedarse esperando un correo que no va a llegar.
     */
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      // Va al campo del correo, que es donde el usuario puede corregirlo.
      throw new ValidationError({
        email: 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.',
      });
    }

    return {
      needsEmailConfirmation: data.session === null,
      session: data.session,
    };
  } catch (cause) {
    throw toAuthError(cause, 'No pudimos crear tu cuenta.');
  }
}

export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (cause) {
    throw toAuthError(cause, 'No pudimos cerrar tu sesión.');
  }
}

/* -------------------------------------------------------------------------- */
/* Contraseña                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Envia el correo de recuperacion.
 *
 * Nunca revela si el correo existe: responde igual en los dos casos. Es lo que
 * hace Supabase por defecto y no conviene deshacerlo, porque aqui el formulario
 * si seria una forma de averiguar quien tiene cuenta --a diferencia del
 * registro, donde el usuario ya demostro conocer la contraseña o no.
 *
 * Importante sobre PKCE: al pedir la recuperacion se guarda un verificador en
 * ESTE dispositivo. El enlace del correo solo sirve, por tanto, abierto en el
 * mismo telefono desde el que se pidio. Abrirlo en el ordenador da un error de
 * codigo invalido.
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: createAuthRedirectUrl(PASSWORD_RESET_PATH),
    });
    if (error) throw error;
  } catch (cause) {
    throw toAuthError(cause, 'No pudimos enviar el correo de recuperación.');
  }
}

/**
 * Cambia la contraseña del usuario en sesion.
 *
 * Sirve para los dos casos: el usuario que la esta cambiando desde su perfil y
 * el que acaba de llegar por el enlace del correo (que, tras canjear el
 * codigo, tambien tiene una sesion valida).
 */
export async function updatePassword(password: string): Promise<User> {
  try {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    if (!data.user) throw new AppError('No pudimos cambiar tu contraseña.', 'no_user');
    return data.user;
  } catch (cause) {
    throw toAuthError(cause, 'No pudimos cambiar tu contraseña.');
  }
}

/**
 * Comprueba que quien pide el cambio conoce la contraseña actual.
 *
 * Supabase NO la exige para `updateUser({ password })`: con una sesion valida
 * basta. Se pide igualmente porque el telefono desbloqueado de alguien es una
 * sesion valida, y sin esta comprobacion cualquiera que lo tuviera en la mano
 * cinco minutos podria cambiar la contraseña y quedarse con la cuenta.
 *
 * Se verifica reintentando el inicio de sesion. Eso emite una sesion nueva
 * para el MISMO usuario --no cierra la actual ni cambia de cuenta--, que es
 * exactamente lo que significa "volver a identificarse".
 */
export async function verifyCurrentPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });

  if (error) {
    // Al campo, no al aviso general: es el único dato que el usuario puede
    // haber tecleado mal aquí, y señalarlo ahorra tener que adivinar.
    throw new ValidationError({ currentPassword: 'La contraseña actual no es correcta.' });
  }
}

/**
 * Canjea el codigo de un enlace por una sesion.
 *
 * Lo usan tanto la vuelta de Google como los enlaces de correo. El codigo es
 * de un solo uso: intentarlo dos veces falla, asi que quien llama debe hacerlo
 * una vez por enlace recibido.
 */
export async function exchangeCode(code: string): Promise<Session> {
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (!data.session) throw new AppError('El enlace ya no es válido.', 'no_session');
    return data.session;
  } catch (cause) {
    throw toAuthError(cause, 'No pudimos validar el enlace. Pide uno nuevo.');
  }
}

/* -------------------------------------------------------------------------- */
/* Google                                                                     */
/* -------------------------------------------------------------------------- */

export type GoogleSignInResult =
  | { status: 'signed-in'; session: Session }
  /** El usuario cerro la pantalla de Google. No es un error. */
  | { status: 'cancelled' };

/**
 * Inicia sesion con Google.
 *
 * El recorrido completo, que conviene tener presente porque cada paso se
 * configura en un sitio distinto:
 *
 *   1. Supabase construye la URL de Google (no se navega todavia:
 *      `skipBrowserRedirect` lo impide).
 *   2. `openAuthSessionAsync` abre esa URL en la vista de navegador segura del
 *      sistema --SFAuthenticationSession en iOS, Custom Tabs en Android-- y se
 *      queda esperando a que vuelva algo con nuestro esquema.
 *   3. El usuario elige su cuenta en google.com.
 *   4. Google redirige a https://<proyecto>.supabase.co/auth/v1/callback.
 *      ESTA es la unica URL que hay que dar de alta en Google Cloud.
 *   5. Supabase crea o enlaza el usuario y redirige a launchpad://auth/callback.
 *      ESTA es la que hay que dar de alta en Supabase.
 *   6. El navegador se cierra solo y devuelve la URL con `?code=...`.
 *   7. Se canjea el codigo por una sesion.
 *
 * Se usa el navegador del sistema y no un WebView propio a proposito: Google
 * bloquea los WebView incrustados desde 2021, y ademas la vista del sistema
 * comparte las cuentas ya iniciadas en Safari o Chrome, asi que casi siempre
 * basta con un toque.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const redirectTo = createAuthRedirectUrl(AUTH_CALLBACK_PATH);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        // Sin esto, supabase-js intentaria navegar el, que en React Native no
        // significa nada. Lo que queremos es la URL para abrirla nosotros.
        skipBrowserRedirect: true,
        queryParams: {
          // Sin `select_account`, quien tenga una sola cuenta en el telefono
          // entra siempre con ella sin poder elegir otra.
          prompt: 'select_account',
        },
      },
    });

    if (error) throw error;
    if (!data.url) throw new AppError('No pudimos abrir Google.', 'no_oauth_url');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    // 'cancel' es cerrar la hoja; 'dismiss' es descartarla con el gesto.
    // Los dos significan lo mismo para el usuario: cambio de opinion.
    if (result.type !== 'success') return { status: 'cancelled' };

    const callback = readAuthCallback(result.url);

    if (callback.kind === 'error') {
      throw new AppError(callback.message, 'oauth_callback_error');
    }

    if (callback.kind !== 'code') {
      console.error('[Launchpad] Callback de Google sin código:', result.url);
      throw new AppError('No pudimos completar el inicio de sesión con Google.', 'oauth_no_code');
    }

    return { status: 'signed-in', session: await exchangeCode(callback.code) };
  } catch (cause) {
    throw toAuthError(cause, 'No pudimos completar el inicio de sesión con Google.');
  }
}

/* -------------------------------------------------------------------------- */
/* Estado de la sesion                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Lee la sesion guardada en el dispositivo.
 *
 * Es lo primero que hace la app al abrirse, y por eso la pantalla de carga
 * inicial existe: hasta que esto responde no se sabe si toca mostrar el acceso
 * o el dashboard, y mostrar el acceso "por si acaso" produciria ese parpadeo
 * de login que aparece un segundo y desaparece.
 */
export async function getStoredSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    // Una sesion ilegible no debe impedir abrir la app: se trata como si no
    // hubiera sesion y el usuario vuelve a entrar.
    console.error('[Launchpad] No se pudo leer la sesión guardada:', error);
    return null;
  }

  return data.session;
}

/**
 * Metodos con los que esta cuenta puede entrar.
 *
 * Supabase guarda una "identidad" por proveedor. Una misma persona puede tener
 * las dos --si se registro con correo y luego entro con Google usando el mismo
 * correo ya confirmado, Supabase las enlaza en la MISMA cuenta-- o solo una.
 *
 * Se leen de DOS sitios y se unen, y no es redundancia:
 *
 *   `identities`   la lista completa y detallada, pero es opcional en el tipo
 *                  y puede no venir en una sesion restaurada del almacen.
 *   `app_metadata` viaja siempre dentro del JWT, asi que esta disponible
 *                  incluso sin haber vuelto a preguntar al servidor.
 *
 * Si solo se mirara `identities`, una sesion restaurada sin ella haria creer
 * que la cuenta no tiene contraseña, y a alguien que si la tiene se le diria
 * que entra con Google. Esa union evita justo ese caso.
 */
export function providersOf(user: User | null): string[] {
  if (!user) return [];

  const fromIdentities = (user.identities ?? []).map((identity) => identity.provider);

  const metadata = user.app_metadata as { provider?: unknown; providers?: unknown };
  const fromMetadata = [
    ...(Array.isArray(metadata.providers) ? metadata.providers : []),
    metadata.provider,
  ].filter((provider): provider is string => typeof provider === 'string' && provider !== '');

  return [...new Set([...fromIdentities, ...fromMetadata])];
}

export function hasPasswordIdentity(user: User | null): boolean {
  return providersOf(user).includes('email');
}
