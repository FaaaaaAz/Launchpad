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
 * Ilustraciones de la mascota.
 * Al agregar una nueva, guárdala en `assets/images/mascot/` y regístrala aquí.
 * Ver `assets/images/mascot/README.md`.
 */
export const mascot = {
  /** Bienvenida tras completar el onboarding. */
  welcome: require('../../assets/images/mascot/welcome.png') as ImageSourcePropType,
};

export type MascotKey = keyof typeof mascot;
