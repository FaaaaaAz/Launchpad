import type { ImageSourcePropType } from 'react-native';

/**
 * Único lugar de la app donde se escribe la ruta de una imagen.
 *
 * Metro necesita que `require()` reciba una cadena literal, así que las rutas
 * no se pueden construir dinámicamente. Centralizarlas aquí evita rutas
 * relativas repartidas por las pantallas y hace que mover una carpeta sea un
 * cambio de un solo archivo.
 */

/** Logotipo: el zorro amarillo sobre negro. */
export const logo: ImageSourcePropType = require('../../assets/images/logo.png');

/**
 * Ilustraciones de la mascota, nombradas por la escena que representan.
 *
 * Se nombran por lo que muestran (`gym`, `study`) y no por el dominio que las
 * usa (`exercise`, `academic`): así una ilustración puede reutilizarse en otro
 * módulo, o cambiarse por otra, sin renombrar archivos. El vínculo con cada
 * módulo se declara en `domains.ts`.
 *
 * Todas tienen fondo transparente, así que se superponen sobre cualquier
 * superficie sin necesidad de máscaras ni degradados.
 *
 * Al agregar una nueva, guárdala en `assets/images/mascot/` y regístrala aquí.
 * Ver `assets/images/mascot/README.md`.
 */
export const mascot = {
  /** Bienvenida tras completar el onboarding. */
  welcome: require('../../assets/images/mascot/welcome.png') as ImageSourcePropType,
  /** Entrenando con mancuernas. Módulo de ejercicio. */
  gym: require('../../assets/images/mascot/gym.png') as ImageSourcePropType,
  /** Estudiando. Módulo académico. */
  study: require('../../assets/images/mascot/study.png') as ImageSourcePropType,
  /** Tiempo libre. Módulo de hobbies. */
  hobby: require('../../assets/images/mascot/hobby.png') as ImageSourcePropType,
  /** Alcancía, calculadora y gráficos. Módulo de finanzas. */
  finance: require('../../assets/images/mascot/finance.png') as ImageSourcePropType,
  /** Con balón. Disponible para actividades deportivas. */
  football: require('../../assets/images/mascot/football.png') as ImageSourcePropType,
};

export type MascotKey = keyof typeof mascot;
