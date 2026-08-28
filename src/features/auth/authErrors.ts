import { AuthError, isAuthWeakPasswordError } from '@supabase/supabase-js';

import { AppError, ValidationError } from '@/utils/errors';

import { MIN_PASSWORD_LENGTH } from './validation';

/**
 * Traducción de los errores de Supabase Auth a algo que una persona pueda
 * leer.
 *
 * Supabase responde en inglés y en su propio vocabulario: «Invalid login
 * credentials», «AuthApiError: User already registered». Ninguno de esos
 * mensajes le dice a nadie qué hacer a continuación, así que ninguno llega a
 * la pantalla tal cual.
 *
 * Se traduce por `code` cuando existe —es estable y está documentado— y se cae
 * al texto del mensaje para las versiones que aún no lo envían. Lo que no se
 * reconoce se convierte en un mensaje genérico y se registra en consola: el
 * usuario ve una frase útil y el detalle sigue estando para depurar.
 *
 * Los errores que pertenecen a un campo concreto (la contraseña es débil, el
 * correo ya existe) se devuelven como `ValidationError`, de modo que
 * `useAsyncAction` los coloca debajo de ese campo en lugar de en un aviso
 * general. Un error de contraseña mostrado a cuatro campos de distancia obliga
 * a adivinar a cuál se refiere.
 */

/* -------------------------------------------------------------------------- */
/* Por codigo                                                                 */
/* -------------------------------------------------------------------------- */

const MESSAGE_BY_CODE: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed: 'Tienes que confirmar tu correo antes de entrar. Revisa tu bandeja.',
  user_already_exists: 'Ya existe una cuenta con este correo.',
  email_exists: 'Ya existe una cuenta con este correo.',
  same_password: 'La contraseña nueva tiene que ser distinta de la actual.',
  email_address_invalid: 'Ese correo no parece válido.',
  validation_failed: 'Revisa los datos que escribiste.',
  signup_disabled: 'El registro está desactivado en este momento.',
  user_not_found: 'No encontramos ninguna cuenta con ese correo.',
  session_not_found: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  otp_expired: 'Ese enlace ya caducó. Pide uno nuevo.',
  provider_disabled: 'Ese método de acceso no está habilitado.',
  reauthentication_needed: 'Por seguridad, vuelve a iniciar sesión antes de hacer este cambio.',
  invalid_current_password: 'La contraseña actual no es correcta.',
};

/**
 * A qué campo del formulario pertenece cada error.
 *
 * `invalid_credentials` NO está aquí a propósito: no sabemos si falló el correo
 * o la contraseña, y señalar uno de los dos sería adivinar. Peor aún, si
 * acertáramos estaríamos confirmando qué correos tienen cuenta.
 */
const FIELD_BY_CODE: Record<string, string> = {
  weak_password: 'password',
  same_password: 'password',
  invalid_current_password: 'currentPassword',
  user_already_exists: 'email',
  email_exists: 'email',
  email_address_invalid: 'email',
  user_not_found: 'email',
};

/* -------------------------------------------------------------------------- */
/* Por texto del mensaje                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Respaldo para proyectos o versiones que todavía no envían `code`.
 * El orden importa: se usa la primera coincidencia.
 */
const MESSAGE_BY_TEXT: [needle: string, message: string][] = [
  ['invalid login credentials', 'El correo o la contraseña no son correctos.'],
  ['email not confirmed', 'Tienes que confirmar tu correo antes de entrar. Revisa tu bandeja.'],
  ['user already registered', 'Ya existe una cuenta con este correo.'],
  ['already been registered', 'Ya existe una cuenta con este correo.'],
  ['different from the old password', 'La contraseña nueva tiene que ser distinta de la actual.'],
  ['unable to validate email', 'Ese correo no parece válido.'],
  ['network request failed', 'No pudimos conectarnos. Comprueba tu conexión.'],
  ['failed to fetch', 'No pudimos conectarnos. Comprueba tu conexión.'],
  ['timeout', 'La conexión tardó demasiado. Inténtalo de nuevo.'],
];

/* -------------------------------------------------------------------------- */
/* Límites de frecuencia                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Los códigos que significan «has ido demasiado rápido».
 *
 * Se tratan aparte del resto porque el plazo de espera NO es el mismo en todos
 * y decir uno equivocado es peor que no decir ninguno: quien lee «espera un
 * minuto» reintenta al minuto, vuelve a fallar y ya no se fía del mensaje.
 */
const RATE_LIMIT_CODES = new Set([
  'over_request_rate_limit',
  'over_email_send_rate_limit',
  'over_sms_send_rate_limit',
]);

/**
 * Cuánto hay que esperar, dicho con la precisión que se pueda.
 *
 * Cuando el servidor incluye los segundos en su mensaje («you can only request
 * this after 46 seconds») se usan tal cual, que es lo más exacto posible.
 *
 * Cuando no los incluye —el caso del límite de correos— se dice el orden de
 * magnitud real y no un número inventado. El servicio de correo integrado de
 * Supabase permite muy pocos envíos por hora: está pensado para probar, no
 * para usarse de verdad. Prometer «un minuto» ahí era sencillamente falso.
 */
function rateLimitMessage(code: string, serverMessage: string): string {
  const seconds = /after (\d+)\s*seconds?/i.exec(serverMessage)?.[1];
  if (seconds) {
    return `Demasiados intentos seguidos. Espera ${seconds} segundos y vuelve a probar.`;
  }

  // Se mira también el texto porque los proyectos más antiguos devuelven
  // «email rate limit exceeded» sin código con el que distinguirlo.
  const isEmail =
    code === 'over_email_send_rate_limit' || /email/i.test(serverMessage);

  if (isEmail) {
    return 'Se enviaron demasiados correos seguidos. Este límite puede tardar hasta una hora en soltarse.';
  }

  return 'Demasiados intentos seguidos. Espera un poco antes de volver a probar.';
}

/* -------------------------------------------------------------------------- */
/* Contraseña débil                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Los conjuntos de caracteres que Supabase puede exigir, tal y como aparecen
 * literalmente dentro de su mensaje de error.
 *
 * El servidor responde algo así:
 *
 *   Password should contain at least one character of each:
 *   abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()...
 *
 * Esa lista es la ÚNICA forma de saber qué pide el proyecto: el requisito se
 * configura en el panel de Supabase y la app no tiene manera de consultarlo.
 * Por eso se lee del propio mensaje en vez de escribir una lista fija que
 * dejaría de ser cierta en cuanto se cambiara el ajuste.
 */
const CHARACTER_SETS: [marker: string, label: string][] = [
  ['abcdefghijklmnopqrstuvwxyz', 'una minúscula'],
  ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'una mayúscula'],
  ['0123456789', 'un número'],
  ['!@#$%^&*', 'un símbolo'],
];

/** Une una lista en español: «a, b y c». */
function joinSpanish(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}

/**
 * Explica por qué Supabase rechazó la contraseña.
 *
 * `reasons` puede traer varias a la vez y son excluyentes entre sí en el
 * sentido de que cada una pide algo distinto, así que se dicen todas: arreglar
 * una y volver a fallar por la siguiente es la peor experiencia posible.
 *
 * Antes esta función no existía y toda contraseña rechazada recibía el mismo
 * «prueba con una más larga», que era falso siempre que el problema fuese la
 * composición: alargar una contraseña sin mayúsculas no la arregla nunca.
 */
function weakPasswordMessage(reasons: readonly string[], serverMessage: string): string {
  const parts: string[] = [];

  if (reasons.includes('length')) {
    // El mínimo lo decide el panel de Supabase, no la app. Se toma del propio
    // mensaje del servidor y solo se cae al valor local si no viene ninguno.
    const declared = /\b(\d+)\b/.exec(serverMessage)?.[1];
    const minimum = declared ?? String(MIN_PASSWORD_LENGTH);
    parts.push(`Debe tener al menos ${minimum} caracteres.`);
  }

  if (reasons.includes('characters')) {
    const required = CHARACTER_SETS.filter(([marker]) => serverMessage.includes(marker)).map(
      ([, label]) => label,
    );

    parts.push(
      required.length > 0
        ? `Debe incluir al menos ${joinSpanish(required)}.`
        : 'Debe combinar mayúsculas, minúsculas, números y símbolos.',
    );
  }

  if (reasons.includes('pwned')) {
    parts.push('Esa contraseña apareció en filtraciones conocidas. Elige otra distinta.');
  }

  if (parts.length === 0) {
    return 'Esa contraseña no cumple los requisitos de seguridad. Prueba con otra.';
  }

  return parts.join(' ');
}

/* -------------------------------------------------------------------------- */
/* Conversion                                                                 */
/* -------------------------------------------------------------------------- */

/** Empaqueta el mensaje en el campo que le corresponde, si es que hay uno. */
function asFieldOrGeneral(code: string | undefined, message: string): AppError {
  const field = code ? FIELD_BY_CODE[code] : undefined;
  return field ? new ValidationError({ [field]: message }) : new AppError(message, code ?? 'auth_error');
}

/**
 * Convierte cualquier cosa lanzada por Supabase Auth en un error cuyo mensaje
 * se puede mostrar tal cual.
 *
 * `fallback` describe la operación en curso ('No pudimos iniciar sesión.') y es
 * lo que se muestra cuando el error no se reconoce.
 */
export function toAuthError(cause: unknown, fallback: string): AppError {
  // Un AppError ya viene traducido: puede venir de nuestra propia validación.
  if (cause instanceof AppError) return cause;

  /**
   * La contraseña débil se trata aparte porque es el único error que trae
   * datos estructurados —`reasons`— además del mensaje. Ignorarlos y quedarse
   * con el código a secas es lo que producía un consejo equivocado.
   */
  if (isAuthWeakPasswordError(cause)) {
    return asFieldOrGeneral(
      'weak_password',
      weakPasswordMessage(cause.reasons, cause.message),
    );
  }

  if (cause instanceof AuthError) {
    // Antes que el resto: el plazo sale del mensaje del servidor cuando viene,
    // y una tabla de textos fijos no puede leerlo.
    if (cause.code && RATE_LIMIT_CODES.has(cause.code)) {
      return new AppError(rateLimitMessage(cause.code, cause.message), cause.code);
    }

    const byCode = cause.code ? MESSAGE_BY_CODE[cause.code] : undefined;
    if (byCode) return asFieldOrGeneral(cause.code, byCode);

    const text = cause.message.toLowerCase();

    // Mismo caso, sin código: proyectos antiguos avisan del límite solo por
    // texto («email rate limit exceeded», «for security purposes…»).
    if (text.includes('rate limit') || text.includes('for security purposes')) {
      return new AppError(rateLimitMessage(cause.code ?? '', cause.message), 'rate_limit');
    }

    const byText = MESSAGE_BY_TEXT.find(([needle]) => text.includes(needle));
    if (byText) return asFieldOrGeneral(cause.code, byText[1]);

    console.error('[Launchpad] Error de Auth sin traducir:', cause.code, cause.message);
    return new AppError(fallback, cause.code ?? 'auth_error');
  }

  if (cause instanceof Error) {
    const text = cause.message.toLowerCase();
    const byText = MESSAGE_BY_TEXT.find(([needle]) => text.includes(needle));
    if (byText) return new AppError(byText[1], 'auth_error');

    console.error('[Launchpad] Error inesperado en Auth:', cause);
    return new AppError(fallback, 'auth_error');
  }

  console.error('[Launchpad] Error desconocido en Auth:', cause);
  return new AppError(fallback, 'auth_error');
}
