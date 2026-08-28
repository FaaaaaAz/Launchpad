/**
 * PAD, la mascota de Launchpad.
 *
 * El nombre vive aquí y no escrito a mano en cada pantalla: si algún día
 * cambia, cambia en un solo sitio.
 */
export const MASCOT_NAME = 'PAD';

/** Frases de PAD para los momentos en que aparece sin un deporte concreto. */
export const PAD_LINES = {
  welcome: 'Soy PAD. Desde aquí llevamos tus tareas, tus entrenamientos y todo lo que quieras mantener bajo control.',
  emptyDay: 'Día libre. PAD también descansa.',
  allDone: 'Todo hecho. PAD está orgulloso.',
} as const;

/**
 * Lo que dice PAD en las pantallas de acceso.
 *
 * Se escriben aquí, junto al resto de su voz, y no dentro de cada pantalla:
 * PAD tiene que sonar igual en todas. Una línea corta y con carácter; si
 * dijera un párrafo, dejaría de leerse.
 */
export const PAD_AUTH_LINES = {
  welcome: 'Organiza tu vida. Define tus objetivos. Empieza a avanzar.',
  login: 'Me alegra verte otra vez.',
  register: 'Vamos a montar tu base de lanzamiento.',
  forgotPassword: 'A todos se nos olvida. Te mando un correo y lo arreglamos.',
  emailSent: 'Correo enviado. Ábrelo desde este mismo teléfono.',
  newPassword: 'Elige una contraseña nueva y seguimos donde lo dejamos.',
  accountCreated: '¡Cuenta creada! Ya tienes dónde guardarlo todo.',
  confirmEmail: 'Te mandé un correo para confirmar que eres tú.',
} as const;
