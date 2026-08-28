import * as Crypto from 'expo-crypto';

/**
 * Instala la parte de WebCrypto que React Native no trae.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ HACE FALTA
 *
 * Hermes no implementa WebCrypto, y ni React Native ni el runtime «winter» de
 * Expo definen `crypto` como global (Expo instala `URL`, `TextDecoder` y
 * `structuredClone`, pero no `crypto`). En el teléfono, por tanto,
 * `typeof crypto === 'undefined'`.
 *
 * `@supabase/auth-js` construye el flujo PKCE con esa API, y cuando no la
 * encuentra NO falla: se degrada, en dos sitios a la vez.
 *
 *   1. El `code_verifier` —el secreto de un solo uso del que depende toda la
 *      seguridad de PKCE— se genera con `Math.random()` en lugar de con un
 *      generador criptográfico. `Math.random()` no está diseñado para esto y
 *      su salida es predecible a partir de suficientes muestras.
 *
 *   2. El `code_challenge` cae de `sha256` a `plain`, es decir, el verificador
 *      viaja tal cual en la URL de autorización en vez de su hash.
 *
 * Juntas dejan el inicio de sesión con Google apoyado en un secreto adivinable
 * que además se envía en claro, que es exactamente lo que PKCE existe para
 * evitar. Solo la segunda avisa por consola:
 *
 *   WARN  WebCrypto API is not supported. Code challenge method will default
 *         to use plain instead of sha256.
 *
 * La primera es silenciosa, y es la peor de las dos.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO LO DETECTÓ EL COMPILADOR
 *
 * `expo/tsconfig.base` incluye la librería `DOM`, así que TypeScript da por
 * hecho que existe un `crypto` global y tipa todo esto sin una sola queja. Los
 * tipos del DOM describen un navegador, no este runtime: aquí mienten.
 *
 * ---------------------------------------------------------------------------
 * CÓMO SE ARREGLA
 *
 * `expo-crypto` ya era dependencia del proyecto (genera los UUID de las
 * entidades) y ofrece las dos piezas que faltan, ambas nativas y seguras:
 * `getRandomValues()` y `digest()`. Esto solo las expone con la forma que
 * espera el estándar.
 *
 * Es un polyfill, así que se importa por su efecto y solo rellena lo que falte:
 * si algún día Hermes o Expo traen WebCrypto de serie, este archivo dejará de
 * hacer nada sin necesidad de tocarlo.
 */

/** Los algoritmos que `expo-crypto` puede calcular en las dos plataformas. */
const DIGEST_ALGORITHMS: Record<string, Crypto.CryptoDigestAlgorithm> = {
  'SHA-1': Crypto.CryptoDigestAlgorithm.SHA1,
  'SHA-256': Crypto.CryptoDigestAlgorithm.SHA256,
  'SHA-384': Crypto.CryptoDigestAlgorithm.SHA384,
  'SHA-512': Crypto.CryptoDigestAlgorithm.SHA512,
};

/** WebCrypto acepta el algoritmo como cadena o como `{ name }`. */
function algorithmName(algorithm: AlgorithmIdentifier): string {
  return (typeof algorithm === 'string' ? algorithm : algorithm.name).toUpperCase();
}

async function digest(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> {
  const name = algorithmName(algorithm);
  const resolved = DIGEST_ALGORITHMS[name];

  if (!resolved) {
    // Se lanza en vez de devolver algo aproximado: un hash silenciosamente
    // distinto del pedido es peor que un error.
    throw new Error(`crypto.subtle.digest: algoritmo no soportado en este dispositivo (${name}).`);
  }

  return Crypto.digest(resolved, data);
}

/**
 * Define una propiedad aunque ya exista uno de solo lectura.
 *
 * Se usa `defineProperty` y no una asignación porque los globales del runtime
 * pueden estar declarados como no escribibles, y en un módulo (que siempre es
 * modo estricto) asignarles algo lanzaría en lugar de fallar en silencio.
 */
function define(target: object, name: string, value: unknown): boolean {
  try {
    Object.defineProperty(target, name, {
      value,
      configurable: true,
      enumerable: false,
      writable: true,
    });
    return true;
  } catch (error) {
    console.error(`[Launchpad] No se pudo instalar ${name} en el entorno:`, error);
    return false;
  }
}

const installed: string[] = [];
const scope = globalThis as typeof globalThis & { crypto?: Crypto };

if (typeof scope.crypto === 'undefined') {
  if (define(scope, 'crypto', {})) installed.push('crypto');
}

const webCrypto = scope.crypto as (Crypto & { subtle?: SubtleCrypto }) | undefined;

if (webCrypto) {
  if (typeof webCrypto.getRandomValues !== 'function') {
    // La firma de `expo-crypto` acepta los enteros con y sin signo; la del
    // estándar habla de `ArrayBufferView`. Se ajusta el tipo en el borde,
    // que es justo lo que hace un polyfill.
    const getRandomValues = Crypto.getRandomValues as unknown as Crypto['getRandomValues'];
    if (define(webCrypto, 'getRandomValues', getRandomValues)) {
      installed.push('crypto.getRandomValues');
    }
  }

  if (typeof webCrypto.subtle === 'undefined') {
    if (define(webCrypto, 'subtle', { digest })) installed.push('crypto.subtle.digest');
  }
}

if (__DEV__) {
  console.log(
    installed.length > 0
      ? `[Launchpad] WebCrypto completado con expo-crypto: ${installed.join(', ')}.`
      : '[Launchpad] WebCrypto ya estaba disponible; no hizo falta ningún polyfill.',
  );

  /**
   * `TextEncoder` es la tercera condición que comprueba auth-js antes de
   * degradarse, y hoy la cumple Hermes por su cuenta (igual que `btoa`, que
   * también necesita). Se comprueba de todos modos porque si algún día
   * dejara de estar, el síntoma sería el mismo aviso de siempre y este
   * archivo parecería no haber servido de nada.
   */
  if (typeof TextEncoder === 'undefined') {
    console.error(
      '[Launchpad] Falta TextEncoder: PKCE seguirá usando `plain` en lugar de sha256.',
    );
  }
}
