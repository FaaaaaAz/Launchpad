# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Launchpad — convenciones del proyecto

Aplicación personal local (sin backend). Ver `README.md` para la arquitectura completa.

## Reglas al escribir código aquí

- **Nunca SQL en una pantalla.** El flujo es `Pantalla → Provider → Service → Repository → SQLite`.
- **Nunca un color, tamaño de fuente o espaciado literal.** Todo sale de `src/theme`.
- **La mascota se llama PAD.** El nombre sale de `MASCOT_NAME`, nunca escrito a mano.
  Cuando la app «habla», lo hace como PAD: una línea corta y con carácter, no un párrafo.
- **La app es negra y amarilla.** El amarillo `#FDC305` está tomado del logo. Los colores
  funcionales (prioridad, pago, estado) NO se tocan: comunican significado, no identidad.
- **Nunca escribas la ruta de una imagen en una pantalla.** Regístrala en
  `src/constants/assets.ts` y úsala desde ahí.
- **Nunca editar una migración ya aplicada.** Se agrega la siguiente en `src/database/migrations/`.
- **Nunca guardar un valor derivable.** El estado de pago se calcula con `getPaymentStatus()`.
- **Las ilustraciones van a 512 px como máximo.** Ver `assets/images/mascot/README.md`.
- **Ejercicio, Académico y Hobbies son la misma entidad** (`Activity` + `domain`). No dupliques
  pantallas: configura `src/constants/domains.ts`.
- Los textos de la interfaz están en español.
- **Teclado.** En pantallas con scroll se usa `automaticallyAdjustKeyboardInsets` (desplaza
  el campo enfocado); en hojas ancladas abajo, el `BottomSheet` compartido. Nunca un
  `KeyboardAvoidingView` envolviendo un ScrollView: solo lo encoge y el último campo
  sigue quedando tapado.
- **Cuadrículas.** Anchos porcentuales con relleno interno y margen negativo, nunca
  porcentajes combinados con `gap`: la suma pasa del 100 % y las celdas se estrujan.
- Toda pantalla con datos maneja los tres estados: cargando, vacío y error
  (`components/ui/States.tsx`).

## Antes de dar algo por terminado

```bash
npm run typecheck
```

El proyecto usa TypeScript estricto con `noUncheckedIndexedAccess`.

## Qué NO agregar todavía

Backend, autenticación, Firebase, sincronización, pagos reales, IA. Y ninguna
dependencia nueva sin una razón concreta del presente, no del futuro.
