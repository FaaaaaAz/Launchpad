# Imágenes de la mascota

El zorro de Launchpad. Una imagen por situación, en PNG.

## Convención de nombres

`<situacion>.png` en minúsculas y en inglés, para que coincida con las claves
de `src/constants/assets.ts`.

| Archivo | Dónde se usa |
| --- | --- |
| `welcome.png` | Bienvenida tras el onboarding |
| `gym.png` | Card de Ejercicio en el dashboard |
| `study.png` | Card de Académico en el dashboard |
| `hobby.png` | Card de Hobbies en el dashboard |
| `finance.png` | Card de la alcancía y resumen de finanzas |
| `football.png` | Libre, para actividades deportivas |

Se nombran por la **escena que muestran**, no por el módulo que las usa. Así una
ilustración puede reutilizarse o cambiarse sin renombrar archivos; el vínculo con
cada módulo se declara en `src/constants/domains.ts`.

## Al agregar una imagen nueva

1. Guarda el archivo aquí con un nombre de la convención.
2. Regístralo en `src/constants/assets.ts` (es el único sitio con `require()`).
3. Úsalo desde el código con `mascot.<clave>`, nunca con una ruta escrita a mano.

## Recomendaciones

- **Fondo transparente**, siempre. Permite superponer la mascota sobre cualquier
  superficie sin máscaras ni degradados. Todas las imágenes actuales lo cumplen.
- **Ancho de 512 px es suficiente.** En pantalla se dibujan entre 72 y 140 px, así
  que incluso a densidad 3x sobra resolución. Los archivos actuales rondan los
  1300 px y pesan ~2 MB cada uno: se ven igual reducidos y el bundle adelgaza
  muchísimo.
