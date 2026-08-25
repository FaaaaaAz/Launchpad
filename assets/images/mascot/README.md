# Imágenes de la mascota

El zorro de Launchpad. Una imagen por situación, en PNG.

## Convención de nombres

`<situacion>.png` en minúsculas y en inglés, para que coincida con las claves
de `src/constants/assets.ts`.

| Archivo | Dónde se usa |
| --- | --- |
| `welcome.png` | Bienvenida tras el onboarding |

## Al agregar una imagen nueva

1. Guarda el archivo aquí con un nombre de la convención.
2. Regístralo en `src/constants/assets.ts` (es el único sitio con `require()`).
3. Úsalo desde el código con `mascot.<clave>`, nunca con una ruta escrita a mano.

## Recomendaciones

- **Fondo transparente** siempre que sea posible: permite superponer la mascota
  sobre cualquier pantalla sin que se vea el rectángulo de la imagen.
  `welcome.png` trae fondo propio, y por eso se difumina con degradados en
  `MascotWelcome.tsx`.
- Alto de 1024 px basta de sobra; más solo agrega peso al bundle.
