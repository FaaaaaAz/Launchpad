# Imágenes de PAD

PAD es el zorro de Launchpad. Una imagen por situación, en PNG.

## Convención de nombres

`<situacion>.png` en minúsculas y en inglés, para que coincida con las claves
de `src/constants/assets.ts`.

Se nombran por la **escena que muestran**, no por el módulo que las usa. Así una
ilustración puede reutilizarse o cambiarse sin renombrar archivos; el vínculo con
cada módulo se declara en `src/constants/domains.ts` y el de cada deporte en
`src/constants/sports.ts`.

| Archivo | Dónde se usa |
| --- | --- |
| `welcome.png` | Bienvenida tras el onboarding |
| `sports.png` | Card de Ejercicio en el dashboard · deporte «Otro» |
| `study.png` | Card de Académico en el dashboard |
| `hobby.png` | Card de Hobbies en el dashboard |
| `finance.png` | Card de la alcancía y resumen de finanzas |
| `gym.png` | Deporte: Gimnasio |
| `football.png` | Deporte: Fútbol |
| `running.png` | Deporte: Running |
| `box.png` | Deporte: Boxeo |
| `swim.png` | Deporte: Natación |
| `tennis.png` | Deporte: Tenis |
| `dance.png` | Deporte: Baile |

## Al agregar una imagen nueva

1. Guarda el archivo aquí con un nombre de la convención.
2. Regístralo en `src/constants/assets.ts` (es el único sitio con `require()`).
3. Si es un deporte, agrégalo también a `src/constants/sports.ts` con su frase
   de PAD y su vocabulario de competencia.
4. Úsalo desde el código con `mascot.<clave>`, nunca con una ruta escrita a mano.

## Recomendaciones

- **Fondo transparente**, siempre. Permite superponer a PAD sobre cualquier
  superficie sin máscaras ni degradados. Todas las imágenes actuales lo cumplen.
- **Máximo 512 px de lado.** En pantalla se dibujan entre 62 y 180 px, así que
  incluso a densidad 3x sobra resolución.

### Cómo reducirlas

Hay un redimensionador sin dependencias (decodifica, reduce con filtro de caja
sobre color premultiplicado y vuelve a codificar). Si vuelves a exportar imágenes
grandes, pide que se apliquen antes de subirlas: pasar de ~1300 px a 512 px
recorta el peso unas 6 veces sin diferencia visible.
