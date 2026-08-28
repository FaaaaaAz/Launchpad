/**
 * Validacion de los formularios de acceso.
 *
 * Se valida en el cliente antes de llamar a Supabase por una razon concreta:
 * un error que se puede detectar aqui se muestra al instante y junto al campo
 * que lo provoca, mientras que el mismo error detectado en el servidor tarda
 * un viaje de red y vuelve como un mensaje general.
 *
 * No sustituye a la validacion del servidor --Supabase comprueba lo suyo de
 * todos modos-- ni pretende hacerlo: es la capa rapida, no la de seguridad.
 *
 * Devuelven un mapa de errores por campo, vacio cuando todo esta bien. Es el
 * mismo formato que consume `ValidationError` y `useAsyncAction`, asi que los
 * errores acaban debajo de su campo sin trabajo extra.
 */

/**
 * Longitud minima de contraseña.
 *
 * Supabase exige 6 por defecto. Aqui se piden 8: son dos caracteres mas para
 * el usuario y varios ordenes de magnitud para quien intente adivinarla. Si
 * subes el minimo en Supabase (Authentication -> Providers -> Email), sube
 * tambien este numero para que el mensaje siga siendo cierto.
 */
export const MIN_PASSWORD_LENGTH = 8;

export const MAX_NAME_LENGTH = 60;

/**
 * Comprobacion deliberadamente laxa: algo, una arroba, algo, un punto, algo.
 *
 * Validar correos con una expresion regular estricta es un clasico error: la
 * gramatica real (RFC 5322) admite cosas que casi ninguna regex acepta, y el
 * unico modo de saber que un correo existe es enviarle un mensaje. Esto solo
 * atrapa erratas evidentes; de la verdad se encarga el correo de confirmacion.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** Normaliza el correo antes de enviarlo: sin espacios y en minúsculas. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* Formularios                                                                */
/* -------------------------------------------------------------------------- */

export interface LoginForm {
  email: string;
  password: string;
}

export function validateLogin(form: LoginForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.email.trim()) errors.email = 'Escribe tu correo.';
  else if (!isValidEmail(form.email)) errors.email = 'Ese correo no parece válido.';

  // Al iniciar sesion NO se comprueba la longitud: la contraseña puede ser
  // antigua y mas corta que el minimo actual. Decirle a alguien que su
  // contraseña correcta es "demasiado corta" seria mentirle.
  if (!form.password) errors.password = 'Escribe tu contraseña.';

  return errors;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateRegister(form: RegisterForm): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = form.name.trim();

  if (!name) errors.name = 'Dinos cómo te llamas.';
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Máximo ${MAX_NAME_LENGTH} caracteres.`;

  if (!form.email.trim()) errors.email = 'Escribe tu correo.';
  else if (!isValidEmail(form.email)) errors.email = 'Ese correo no parece válido.';

  if (!form.password) {
    errors.password = 'Elige una contraseña.';
  } else if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Repite la contraseña.';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }

  return errors;
}

export function validateEmailOnly(email: string): Record<string, string> {
  if (!email.trim()) return { email: 'Escribe tu correo.' };
  if (!isValidEmail(email)) return { email: 'Ese correo no parece válido.' };
  return {};
}

export interface NewPasswordForm {
  password: string;
  confirmPassword: string;
}

export function validateNewPassword(form: NewPasswordForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.password) {
    errors.password = 'Elige una contraseña.';
  } else if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }

  return errors;
}
