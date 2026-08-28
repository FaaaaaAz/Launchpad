// Los dos polyfills van antes que nada, porque `createClient` ya los necesita.
//
// URL: `@supabase/supabase-js` construye URLs con `searchParams`, y la
// implementacion que trae React Native esta incompleta.
import 'react-native-url-polyfill/auto';

// WebCrypto: React Native no define `crypto`, y sin el, `auth-js` genera el
// secreto de PKCE con `Math.random()` y manda el desafio en claro. Ver el
// archivo para el detalle; no es un aviso cosmetico.
import './webCryptoPolyfill';

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';

import type { Database } from './database.types';

/**
 * Cliente unico de Supabase.
 *
 * Es el equivalente remoto de `database/database.ts`: una sola conexion para
 * toda la app, creada una vez. Nadie mas debe llamar a `createClient`.
 */

/* -------------------------------------------------------------------------- */
/* Configuracion                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Las variables `EXPO_PUBLIC_*` se incrustan en el bundle al compilar, asi que
 * hay que leerlas por su nombre completo y literal: `process.env` no es un
 * objeto real en tiempo de ejecucion y `process.env[nombre]` devolveria
 * `undefined`.
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

/**
 * Supabase renombro la clave `anon` a "publishable". Se aceptan los dos
 * nombres para que un proyecto creado antes del cambio no obligue a tocar
 * codigo, y se prefiere el nuevo.
 */
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Si falta la configuracion, la app no puede arrancar y hay que decir por que. */
export const supabaseConfigError: string | null = (() => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return 'Falta la configuración de Supabase. Copia .env.example a .env, rellena las dos variables y reinicia con `npx expo start --clear`.';
  }

  if (!/^https:\/\/.+\.supabase\.(co|in)$/.test(SUPABASE_URL)) {
    return 'EXPO_PUBLIC_SUPABASE_URL no parece la URL de un proyecto de Supabase (debe ser https://<proyecto>.supabase.co).';
  }

  // La `service_role` se salta Row Level Security. Dentro de una app movil
  // equivale a publicar la base de datos entera, asi que se detecta y se
  // rechaza aqui en lugar de dejar que funcione y parezca correcto.
  if (SUPABASE_KEY.startsWith('sb_secret_') || SUPABASE_KEY.includes('service_role')) {
    return 'Estás usando la clave secreta (service_role) en el cliente. Sustitúyela por la clave publishable.';
  }

  return null;
})();

/* -------------------------------------------------------------------------- */
/* Reintento por desfase de reloj                                             */
/* -------------------------------------------------------------------------- */

/**
 * PostgREST rechaza un token cuyo `iat` («emitido en») esté por delante de su
 * propio reloj. Devuelve el código `PGRST303`, «JWT issued at future».
 */
const CLOCK_SKEW_CODE = 'PGRST303';

/** Esperas entre reintentos. Dos intentos extra cubren unos segundos de desfase. */
const CLOCK_SKEW_RETRY_DELAYS_MS = [1500, 3000];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `fetch` que reintenta cuando el token se rechaza por desfase de reloj.
 *
 * Quien FIRMA el token (Supabase Auth) y quien lo VALIDA (PostgREST) son dos
 * servicios distintos con dos relojes distintos. Si el de PostgREST va unos
 * segundos por detrás, un token recién emitido le parece venido del futuro y lo
 * rechaza.
 *
 * En la práctica esto solo se nota en la PRIMERA consulta después de
 * registrarse o iniciar sesión, que es justo el peor momento posible: el perfil
 * no carga, el saludo sale sin nombre y la app parece rota el día que alguien
 * la estrena. Segundos después el mismo token funciona sin tocar nada.
 *
 * Se resuelve aquí, envolviendo el `fetch` del cliente, y no en cada
 * repositorio: así vale para todas las consultas —perfil, tareas, actividades—
 * en un solo sitio y sin que ninguna capa superior tenga que enterarse.
 *
 * Solo se reintenta este caso concreto. Un 401 normal (sesión caducada, token
 * inválido) sigue fallando de inmediato: reintentarlo únicamente retrasaría el
 * momento de mandar al usuario a iniciar sesión.
 */
async function fetchWithClockSkewRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let response = await fetch(input, init);

  for (const delay of CLOCK_SKEW_RETRY_DELAYS_MS) {
    if (response.status !== 401 && response.status !== 403) return response;

    let body: string;
    try {
      // Se clona porque leer el cuerpo lo consume, y si no vamos a reintentar
      // hay que devolver la respuesta intacta a quien la pidió.
      body = await response.clone().text();
    } catch {
      return response;
    }

    if (!body.includes(CLOCK_SKEW_CODE)) return response;

    console.warn(
      `[Launchpad] Token rechazado por desfase de reloj (${CLOCK_SKEW_CODE}). Reintentando en ${delay} ms.`,
    );

    await wait(delay);
    response = await fetch(input, init);
  }

  return response;
}

/* -------------------------------------------------------------------------- */
/* Cliente                                                                    */
/* -------------------------------------------------------------------------- */

export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL ?? 'https://launchpad.invalid',
  SUPABASE_KEY ?? 'missing-key',
  {
    auth: {
      /**
       * La sesion se guarda en el almacen clave/valor de `expo-sqlite`, que
       * expone la misma interfaz que AsyncStorage.
       *
       * Se eligio en vez de agregar `@react-native-async-storage/async-storage`
       * porque `expo-sqlite` ya es una dependencia del proyecto: cero modulos
       * nativos nuevos y, por tanto, sigue funcionando en Expo Go.
       *
       * No se usa `expo-secure-store` porque su limite es de 2 KB por entrada
       * y una sesion de Supabase (JWT + refresh token) lo supera, lo que
       * obligaria a partirla en trozos. Es tambien lo que recomienda la
       * documentacion de Supabase para Expo.
       */
      storage: AsyncStorage,

      // Sin esto, cada arranque de la app pediria iniciar sesion otra vez.
      persistSession: true,

      // El access token dura una hora; esto lo renueva solo con el refresh
      // token mientras la app este en primer plano.
      autoRefreshToken: true,

      /**
       * `detectSessionInUrl` sirve para la web, donde el navegador aterriza en
       * una URL con el token puesto. En React Native el callback llega por
       * deep link y lo procesa `features/auth/googleAuth.ts` a mano, asi que
       * dejarlo activo solo provocaria trabajo inutil.
       */
      detectSessionInUrl: false,

      /**
       * PKCE en lugar del flujo implicito.
       *
       * En movil el token no puede viajar en el fragmento de la URL sin que
       * cualquier app registrada para el mismo esquema pueda leerlo. Con PKCE
       * lo que vuelve es un codigo de un solo uso que solo sirve acompanado
       * del verificador que quedo guardado en este dispositivo.
       */
      flowType: 'pkce',
    },

    global: {
      // Absorbe el desfase de reloj entre Auth y PostgREST. Ver arriba.
      fetch: fetchWithClockSkewRetry,
    },
  },
);

/* -------------------------------------------------------------------------- */
/* Renovacion del token en segundo plano                                      */
/* -------------------------------------------------------------------------- */

/**
 * `autoRefreshToken` programa un temporizador, y iOS congela los temporizadores
 * de las apps en segundo plano. Sin esto, volver a la app tras un rato larga
 * dejaria un token caducado y la primera consulta fallaria con un 401.
 *
 * Se registra a nivel de modulo (no dentro de un componente) porque debe estar
 * activo mientras la app viva, no mientras una pantalla este montada.
 */
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
