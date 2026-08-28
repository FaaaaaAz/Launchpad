# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Launchpad — convenciones del proyecto

Aplicación personal con cuenta de usuario y datos en Supabase. Ver `README.md` para la
arquitectura completa y `supabase/README.md` para la base de datos.

## Reglas al escribir código aquí

- **Nunca SQL ni `supabase.from()` en una pantalla.** El flujo es
  `Pantalla → Provider → Service → Repository → Supabase`.
- **Nunca `supabase.auth` fuera de `features/auth/`.** Las pantallas usan `useAuth()`.
  Si cada una consultara por su cuenta, la app tendría tantas verdades sobre la sesión
  como pantallas montadas.
- **Nunca un mensaje de error de Supabase en pantalla.** Se traduce en
  `features/auth/authErrors.ts` (Auth) o en `repositories/supabase/rows.ts` (datos).
  El usuario lee qué hacer; el detalle técnico va a consola.
- **Un error de un campo se muestra en ese campo.** `authErrors.ts` devuelve
  `ValidationError` para los que se pueden atribuir (contraseña débil, correo ya
  registrado) y `useAsyncAction` los coloca debajo del campo. `invalid_credentials`
  es la excepción: no sabemos cuál de los dos falló, y acertar sería confirmar qué
  correos tienen cuenta.
- **Si un error trae datos estructurados, úsalos.** `weak_password` viene con
  `reasons` (`length` / `characters` / `pwned`). Traducir solo el código produjo un
  «prueba con una más larga» ante una contraseña de 19 caracteres a la que solo le
  faltaba una mayúscula.

## Cuidado: los tipos del DOM mienten aquí

`expo/tsconfig.base` incluye `"lib": ["DOM", "ESNext"]`, así que TypeScript da por buenos
globales de navegador que **no existen en Hermes**. Compila sin una queja y falla en el
teléfono.

Confirmado en este runtime (SDK 54): `btoa`, `atob` y `TextEncoder` **sí** están;
`TextDecoder`, `URL` y `structuredClone` los instala Expo; `crypto` **no lo instala
nadie** — lo rellena `src/lib/webCryptoPolyfill.ts`.

Antes de apoyarte en un global de navegador, compruébalo. Un sondeo rápido:

```bash
grep -c "TextEncoder" node_modules/react-native/sdks/hermesc/osx-bin/hermes
```

y mira si Expo lo instala en `node_modules/expo/src/winter/runtime.native.ts`.
- **Toda tabla nueva nace con `user_id` y con RLS.** Sin las dos cosas, los datos de
  una cuenta son visibles desde otra. Ver `supabase/migrations/*_row_level_security.sql`.
- **Nunca la `service_role` key en el cliente.** Se salta RLS por completo.
- **Nunca un color, tamaño de fuente o espaciado literal.** Todo sale de `src/theme`.
- **La mascota se llama PAD.** El nombre sale de `MASCOT_NAME`, nunca escrito a mano.
  Cuando la app «habla», lo hace como PAD: una línea corta y con carácter, no un párrafo.
  Sus frases viven en `constants/mascot.ts`.
- **La app es negra y amarilla.** El amarillo `#FDC305` está tomado del logo. Los colores
  funcionales (prioridad, pago, estado) NO se tocan: comunican significado, no identidad.
- **Nunca escribas la ruta de una imagen en una pantalla.** Regístrala en
  `src/constants/assets.ts` y úsala desde ahí.
- **Nunca editar una migración ya aplicada**, ni la de SQLite (`src/database/migrations/`)
  ni la de Postgres (`supabase/migrations/`). Se agrega la siguiente.
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
  (`components/ui/States.tsx`). Las de acceso usan `AuthFeedback`.

## Tipos de la base de datos

`src/lib/database.types.ts` describe el esquema para que TypeScript compruebe las
consultas. **Todo son `type`, nunca `interface`**: un `interface` no es asignable a
`Record<string, unknown>`, y con uno solo el esquema entero deja de reconocerse y las
consultas se resuelven a `never`, con errores que no dicen nada de la causa.

Ese archivo describe el esquema; no lo define. La fuente de verdad son las migraciones.

## Antes de dar algo por terminado

```bash
npm run typecheck
```

El proyecto usa TypeScript estricto con `noUncheckedIndexedAccess`.

Si tocaste rutas (`src/app/`), los tipos de Expo Router se regeneran al arrancar
`npx expo start`; hasta entonces `typecheck` marcará las rutas nuevas como inexistentes.

## Qué NO agregar todavía

Apple/Facebook/GitHub Sign In, magic links como método principal, MFA, roles,
equipos, suscripciones, pagos reales, IA, chat, sistema social, sincronización
offline. Y ninguna dependencia nueva sin una razón concreta del presente, no del
futuro.
