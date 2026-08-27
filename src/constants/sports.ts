import type { MascotKey } from './assets';
import type { IconName } from './domains';

/**
 * Deportes que PAD sabe acompañar.
 *
 * Cada uno tiene su ilustración, su frase y su vocabulario propio: en fútbol
 * se juegan partidos, en natación se compite y en boxeo se pelea. Ese detalle
 * es lo que hace que la app se sienta hecha para el deporte que practicas y no
 * un formulario genérico.
 *
 * Agregar un deporte es agregar una entrada aquí y su imagen en
 * `assets/images/mascot/`.
 */
export type SportKey =
  | 'gym'
  | 'football'
  | 'box'
  | 'running'
  | 'swim'
  | 'tennis'
  | 'dance'
  | 'other';

export interface SportConfig {
  key: SportKey;
  label: string;
  icon: IconName;
  /** Ilustración de PAD practicando este deporte. */
  mascot: MascotKey | null;
  /** Lo que PAD te dice cuando abres esta actividad. */
  motivation: string;
  /** Si además de entrenamientos tiene competencias. */
  hasMatches: boolean;
  /** Cómo se llama la competencia en este deporte. */
  matchLabel: string;
  matchLabelPlural: string;
}

export const SPORT_CONFIG: Record<SportKey, SportConfig> = {
  gym: {
    key: 'gym',
    label: 'Gimnasio',
    icon: 'barbell',
    mascot: 'gym',
    motivation: 'Una serie más de la que querías hacer. Ahí empieza lo bueno.',
    hasMatches: false,
    matchLabel: 'Evaluación',
    matchLabelPlural: 'Evaluaciones',
  },
  football: {
    key: 'football',
    label: 'Fútbol',
    icon: 'football',
    mascot: 'football',
    motivation: 'El partido del domingo se gana en los entrenamientos de la semana.',
    hasMatches: true,
    matchLabel: 'Partido',
    matchLabelPlural: 'Partidos',
  },
  box: {
    key: 'box',
    label: 'Boxeo',
    icon: 'hand-left',
    mascot: 'box',
    motivation: 'Guardia arriba. Nadie te ve entrenar, todos te ven ganar.',
    hasMatches: true,
    matchLabel: 'Pelea',
    matchLabelPlural: 'Peleas',
  },
  running: {
    key: 'running',
    label: 'Running',
    icon: 'walk',
    mascot: 'running',
    motivation: 'No tienes que ser rápido hoy. Solo tienes que salir.',
    hasMatches: true,
    matchLabel: 'Carrera',
    matchLabelPlural: 'Carreras',
  },
  swim: {
    key: 'swim',
    label: 'Natación',
    icon: 'water',
    mascot: 'swim',
    motivation: 'El agua no negocia. Métete igual y sal mejor.',
    hasMatches: true,
    matchLabel: 'Competencia',
    matchLabelPlural: 'Competencias',
  },
  tennis: {
    key: 'tennis',
    label: 'Tenis',
    icon: 'tennisball',
    mascot: 'tennis',
    motivation: 'Punto a punto. Así se ganan los sets y así se ganan los meses.',
    hasMatches: true,
    matchLabel: 'Partido',
    matchLabelPlural: 'Partidos',
  },
  dance: {
    key: 'dance',
    label: 'Baile',
    icon: 'musical-notes',
    mascot: 'dance',
    motivation: 'Si te equivocas con ritmo, sigue siendo baile. Sigue.',
    hasMatches: true,
    matchLabel: 'Presentación',
    matchLabelPlural: 'Presentaciones',
  },
  other: {
    key: 'other',
    label: 'Otro',
    icon: 'fitness',
    mascot: 'sports',
    motivation: 'Sea lo que sea, que esta semana pase dos veces.',
    hasMatches: true,
    matchLabel: 'Evento',
    matchLabelPlural: 'Eventos',
  },
};

/** Orden en que se ofrecen los deportes al crear una actividad. */
export const SPORT_ORDER: SportKey[] = [
  'gym',
  'football',
  'running',
  'box',
  'swim',
  'tennis',
  'dance',
  'other',
];

const SPORT_KEYS = new Set<string>(SPORT_ORDER);

/** Convierte el texto guardado en un deporte válido, o `null` si no lo es. */
export function parseSportKey(value: string | null): SportKey | null {
  return value !== null && SPORT_KEYS.has(value) ? (value as SportKey) : null;
}

export function getSportConfig(key: SportKey): SportConfig {
  return SPORT_CONFIG[key];
}
