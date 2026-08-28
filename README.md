# Launchpad

Aplicación móvil personal de organización: tareas, actividades (gimnasio, materias, hobbies),
recordatorios locales y control económico básico de cada actividad.

Los datos viven en **tu cuenta**, no en el teléfono. Si borras la app y la vuelves a
instalar, todo vuelve al iniciar sesión.

---

## Cómo ejecutarla

```bash
npm install
cp .env.example .env      # y rellena los dos valores (ver más abajo)
npx expo start
```

Escanea el QR con la cámara del iPhone y ábrelo en **Expo Go**.
El teléfono y la computadora deben estar en la misma red Wi-Fi.

Si la red bloquea la conexión directa:

```bash
npx expo start --tunnel
```

Otros comandos:

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo |
| `npm run typecheck` | Verifica los tipos sin compilar |
| `npx expo start --clear` | Arranca limpiando la caché de Metro |

> Después de tocar `.env` hay que arrancar con `--clear`. Las variables `EXPO_PUBLIC_*`
> se incrustan en el bundle al compilar; no se leen en caliente.

---

## Variables de entorno

`.env.example` es la plantilla. Cópiala a `.env`, que está en `.gitignore` y no debe
subirse nunca.

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Las dos salen del panel de Supabase: **Project Settings → API Keys**.

Si tu proyecto es anterior al cambio de nombre, la clave `anon` (un JWT largo que empieza
por `eyJ...`) sirve igual: el cliente acepta los dos nombres.

**Los dos valores son públicos por diseño.** Viajan dentro de la app y cualquiera puede
extraerlos del binario. Lo que protege los datos no es esconder la clave, es Row Level
Security. Por eso mismo, la clave **`service_role` / secret key jamás va aquí**: se salta
RLS por completo y dentro de una app móvil equivale a publicar la base de datos entera.
El cliente detecta ese caso y se niega a arrancar.

---

## Supabase

### 1. Crear el proyecto

[supabase.com](https://supabase.com) → **New project**. Elige la región más cercana y
guarda la contraseña de la base de datos.

### 2. Ejecutar las migraciones

Todo el esquema, las policies y los triggers están en `supabase/migrations/`. Las
instrucciones —SQL Editor o CLI— están en **[`supabase/README.md`](supabase/README.md)**.

### 3. Configurar el acceso por correo

**Authentication → Providers → Email**

| Ajuste | Recomendación |
| --- | --- |
| Enable Email provider | Activado |
| Confirm email | Tú eliges (ver abajo) |
| Minimum password length | 8, para que coincida con `MIN_PASSWORD_LENGTH` |
| Password Requirements | El que prefieras (ver abajo) |

**Sobre los requisitos de composición.** Si activas «Lowercase, uppercase letters, digits
and symbols», Supabase rechazará las contraseñas que no los combinen. La app **no puede
consultar ese ajuste**, así que no lo valida por adelantado: deja que el servidor sea la
autoridad y traduce su respuesta. El mensaje que ve el usuario se construye leyendo qué
conjuntos exige el propio error, así que sigue siendo exacto aunque cambies el ajuste.

Si prefieres menos fricción, «Letters and digits» basta: la app ya exige 8 caracteres
mínimos por su cuenta.

Sobre **Confirm email**, la app funciona de las dos maneras y lo detecta sola:

- **Desactivado** — `signUp` devuelve sesión y el usuario entra directo al dashboard.
  Es lo más cómodo mientras desarrollas.
- **Activado** — no hay sesión hasta abrir el correo. El registro muestra «Confirma tu
  correo» y el enlace, abierto en el mismo teléfono, mete al usuario dentro.

> ⚠️ **El correo integrado de Supabase permite poquísimos envíos por hora.**
>
> Es un servicio de cortesía pensado para probar, no para usarse. Con «Confirm email»
> activado, **cada intento de registro consume uno**, así que dos o tres pruebas seguidas
> agotan la cuota y el registro empieza a fallar con *«Se enviaron demasiados correos
> seguidos»*. No es un fallo de la app: el límite es del proyecto y puede tardar hasta una
> hora en soltarse.
>
> Tres salidas, de más a menos inmediata:
>
> 1. **Desactiva «Confirm email» mientras desarrollas.** Sin correo que enviar no hay
>    límite que agotar, y el registro entra directo al dashboard. Es lo que recomiendo
>    hasta que la app esté lista para publicarse.
> 2. **Configura tu propio SMTP** en *Authentication → Emails → SMTP Settings* (Resend,
>    SendGrid, Postmark…). Es obligatorio para producción de todos modos, y sube el límite
>    a lo que ajustes en *Authentication → Rate Limits*.
> 3. **Espera.** La cuota se repone sola.
>
> Al cambiar el ajuste, revisa *Authentication → Users*: las cuentas creadas antes siguen
> **sin confirmar** y no podrán iniciar sesión (`email_not_confirmed`). Desactivar la
> confirmación no las confirma retroactivamente. Bórralas si eran pruebas, o confírmalas a
> mano desde ahí.

### 4. Configurar las Redirect URLs

**Authentication → URL Configuration → Redirect URLs**

```text
launchpad://**
exp://**
```

`launchpad://` es el esquema de la app, declarado en `app.json`. Es el que se usa en un
development build y en producción.

`exp://` **solo hace falta mientras pruebas en Expo Go**, porque ahí la app no tiene
esquema propio: el callback vuelve a `exp://192.168.1.20:8081/--/auth/callback`, y esa
dirección IP cambia de red en red. **Quítalo antes de publicar**: con él, cualquier
proyecto de Expo Go podría recibir el callback.

### 5. Configurar Google

Son dos paneles y es fácil confundirse sobre qué va en cuál.

**En Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):

1. Crea un proyecto (o usa uno existente).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*, pon un
   nombre de app y tu correo de contacto. Mientras esté en modo *Testing*, añádete como
   *usuario de prueba*, o Google rechazará tu propio inicio de sesión.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth**.
   Tipo de aplicación: **Aplicación web**.

   > Sí, «web», aunque Launchpad sea una app móvil. Quien recibe la respuesta de Google
   > no es el teléfono: es Supabase, que es un servidor web. El teléfono solo abre el
   > navegador y recoge el resultado al final.

4. En **URIs de redireccionamiento autorizados**, pon exactamente:

   ```text
   https://<tu-project-ref>.supabase.co/auth/v1/callback
   ```

   Esta es la **única** URL que Google necesita conocer. El esquema `launchpad://` no se
   pone aquí —Google no lo aceptaría—: eso va en Supabase.

5. Copia el **Client ID** y el **Client Secret**.

**En Supabase** (**Authentication → Providers → Google**):

1. Activa el proveedor.
2. Pega el Client ID y el Client Secret.
3. Guarda.

El recorrido completo queda así:

```text
Launchpad  →  navegador del sistema  →  google.com
                                            ↓
                          https://<ref>.supabase.co/auth/v1/callback   (Google Cloud)
                                            ↓
                              launchpad://auth/callback                (Supabase)
                                            ↓
                          código  →  sesión  →  Dashboard
```

El código está en `src/features/auth/authService.ts` (`signInWithGoogle`) y las URLs
en `src/features/auth/deepLinks.ts`.

**Ningún secreto de Google entra en este repositorio.** El Client Secret vive solo en el
panel de Supabase.

---

## Expo Go y el development build

Esta es la parte donde conviene no engañarse.

### Qué funciona hoy en Expo Go

| | Expo Go |
| --- | --- |
| Registro e inicio de sesión con correo | ✅ |
| Sesión que sobrevive a cerrar la app | ✅ |
| Todos los datos en Supabase | ✅ |
| Notificaciones locales | ✅ |
| Continuar con Google | ⚠️ con `exp://**` en las Redirect URLs |
| Enlace de recuperación por correo | ⚠️ frágil (ver abajo) |

No hizo falta ningún módulo nativo nuevo. La sesión se guarda con el almacén clave/valor
de `expo-sqlite`, que ya era una dependencia, y el navegador de Google se abre con
`expo-web-browser`, que viene dentro de Expo Go.

### Qué es frágil en Expo Go, y por qué

En Expo Go la app **no tiene esquema propio**: comparte el de Expo Go y su dirección es
`exp://<ip-de-tu-computadora>:8081/--/...`. De ahí salen tres molestias reales:

1. **La IP cambia** al cambiar de red, y con ella la URL de vuelta. Por eso hace falta el
   comodín `exp://**`.
2. **El correo de recuperación lleva esa IP dentro.** El enlace solo funciona mientras el
   servidor de desarrollo siga levantado en la misma dirección, y iOS Mail no siempre
   convierte `exp://...` en un enlace pulsable: a veces hay que copiarlo y pegarlo.
3. **El servidor tiene que estar encendido** para volver a la app.

Nada de esto es un problema de arquitectura —el código es el mismo en los dos casos— sino
de que Expo Go no puede tener un esquema por app.

### El development build

Un *development build* es tu propia app instalada en el teléfono, con el esquema
`launchpad://` de verdad. Con él, los tres puntos de arriba desaparecen: el enlace del
correo es `launchpad://auth/reset-password`, funciona con la app cerrada, en cualquier
red y sin servidor encendido.

**Ventaja adicional:** deja de aplicar la limitación del SDK. Este proyecto está fijado a
Expo SDK 54 porque el Expo Go de un iPhone con iOS anterior a 16.4 no soporta versiones
más nuevas. Con un development build tú decides la versión.

**Cómo crearlo:**

*Con un Mac:*

```bash
npx expo run:ios --device
```

Xcode instala la app en el iPhone conectado. Con una cuenta de Apple gratuita basta; el
perfil caduca a los 7 días y hay que reinstalar.

*Sin un Mac (EAS Build, compila en la nube):*

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --profile development --platform ios
```

Al terminar, EAS da un QR para instalar la app. **Esto necesita una cuenta de Apple
Developer de pago (99 USD/año)** para poder registrar el dispositivo; es el único camino
sin Mac y conviene saberlo antes de empezar.

Después, se sigue desarrollando igual:

```bash
npx expo start --dev-client
```

### Recomendación

Quédate en Expo Go para el día a día: correo, contraseña y todos los datos funcionan sin
fricción. Pasa al development build cuando quieras usar Google y la recuperación de
contraseña a diario, o cuando vayas a publicar.

---

## Stack

| Pieza | Elección |
| --- | --- |
| Framework | Expo SDK 54 · React Native 0.81 |
| Lenguaje | TypeScript en modo estricto |
| iOS mínimo | 15.1 (requisito de Expo Go para SDK 54) |
| Navegación | Expo Router (rutas por archivos, en `src/app/`) |
| Cuenta y datos | Supabase (Auth + PostgreSQL + Row Level Security) |
| Sesión persistida | `expo-sqlite/kv-store` (compatible con AsyncStorage) |
| OAuth | `expo-web-browser` + `expo-linking` (PKCE) |
| WebCrypto | `expo-crypto`, expuesto como `crypto.subtle` (lo necesita PKCE) |
| Preferencias del dispositivo | `expo-sqlite` con migraciones versionadas |
| Notificaciones | `expo-notifications` (solo locales) |
| Imágenes | `expo-image-picker` + `expo-file-system` |
| Estado | React Context + hooks (sin librería externa) |
| Degradados | `expo-linear-gradient` |

### Por qué SDK 54 y no el último

Expo Go solo soporta **una** versión de SDK a la vez, y la App Store entrega la Expo Go
más nueva **compatible con el iOS del teléfono**. El iPhone de pruebas corre un iOS
anterior a 16.4, que es lo que exige el SDK 57, así que su Expo Go se queda en SDK 54 y
un proyecto en 57 le da *«Project is incompatible with this version of Expo Go»*.

> ⚠️ **Actualizar el iOS y subir el SDK son la misma tarea.**
> En cuanto actualices el iOS, Expo Go saltará al SDK más nuevo y este proyecto dejará de
> abrir con el mismo error, pero invertido. Haz las dos cosas en la misma sesión.

**Para subir de SDK:** actualiza el iOS del teléfono, reinstala Expo Go y luego:

```bash
npx expo install expo@latest
npx expo install --fix
npm run typecheck
npx expo start --clear
```

---

## Estructura

```text
supabase/
└── migrations/          Esquema, RLS y triggers de PostgreSQL

src/
├── app/                 Rutas de Expo Router (una pantalla = un archivo)
│   ├── (auth)/          Bienvenida · Login · Registro · Olvidé mi contraseña
│   ├── (tabs)/          Inicio · Ejercicio · Académico · Hobbies · Tareas
│   ├── account/         Mi cuenta, editar perfil, cambiar contraseña
│   ├── activity/        Detalle, creación y edición de actividades
│   ├── finance/         Alcancía y sus formularios
│   ├── task/            Creación y edición de tareas
│   ├── reset-password.tsx
│   └── settings.tsx
│
├── lib/                 Cliente de Supabase y tipos del esquema
│
├── components/          Componentes sin lógica de negocio
│   ├── ui/              Card, Button, Badge, Text, ListRow, estados…
│   ├── form/            Campos de formulario
│   └── navigation/      BubbleTabBar (barra flotante con burbuja)
│
├── features/            Un módulo por dominio funcional
│   ├── auth/            Sesión, acceso, Google, enlaces, importación
│   ├── account/         Operaciones sobre la cuenta entera
│   ├── activities/      Ejercicio + Académico + Hobbies (misma entidad)
│   ├── tasks/
│   ├── dashboard/
│   ├── finance/         Alcancía: ingresos, gastos, deudas y ahorros
│   ├── welcome/         Saludo animado de la mascota
│   └── notifications/
│
├── database/            Persistencia
│   ├── migrations/      Esquema local versionado (preferencias y datos previos)
│   ├── repositories/
│   │   ├── types.ts     Los contratos. Todo lo demás depende solo de esto.
│   │   ├── sqlite/      Implementación local
│   │   ├── supabase/    Implementación en la nube
│   │   └── index.ts     Quién gana: la única línea que decide
│   ├── database.ts      Conexión local
│   └── sql.ts           Utilidades de mapeo
│
├── services/            Servicios transversales (notificaciones, imágenes)
├── providers/           Contextos globales (base local, preferencias)
├── hooks/               Hooks reutilizables
├── types/               Modelos del dominio
├── constants/           Configuración por dominio y enumeraciones
├── theme/               Colores, espaciado, tipografía
└── utils/               Fechas, formato, errores, IDs
```

---

## Arquitectura

El flujo de datos va siempre en una dirección:

```text
Pantalla  →  Provider  →  Service  →  Repository  →  Supabase
 (UI)        (estado)     (reglas)    (interfaz)     (datos)
```

Cada capa tiene una responsabilidad y ninguna se salta a la siguiente.
En concreto: **ninguna pantalla hace una consulta**, y ningún repositorio conoce reglas de
negocio.

### Decisiones que conviene conocer

**El backend entró cambiando un archivo.**
`database/repositories/types.ts` definía los contratos desde el primer día, y
`repositories/index.ts` decidía la implementación. Al llegar Supabase se escribieron los
repositorios nuevos y se cambió esa constante. Ni un servicio ni una pantalla se
enteraron. Era la apuesta del diseño original y se pagó sola.

**Supabase es la fuente de verdad; SQLite se queda con lo del dispositivo.**
Lo que pertenece a la cuenta —tareas, actividades, pagos, alcancía— vive en Postgres. Lo
que pertenece a este teléfono —la moneda elegida, si ya viste el saludo de PAD— sigue en
SQLite. Subir lo segundo obligaría a decidir qué pasa cuando dos dispositivos discrepan,
y no hay nada que ganar con esa respuesta.

**No hay cache offline, y es a propósito.**
Era la opción más simple y segura para esta etapa: una sola fuente de verdad, sin
conflictos que resolver. La consecuencia es que la app necesita conexión. La arquitectura
admite añadirla después sin tocar pantallas —un repositorio que consulte primero SQLite y
luego Supabase se enchufa en `repositories/index.ts`— pero hasta entonces conviene saberlo.

**Row Level Security es lo único que separa una cuenta de otra.**
La clave publicable viaja dentro del binario, así que cualquiera puede extraerla y hablar
con la API. Toda tabla tiene `user_id`, RLS activo y cuatro policies contra `auth.uid()`.
El rol `anon` no tiene permiso sobre ninguna tabla.

**El cliente nunca envía `user_id`.**
Lo rellena el `DEFAULT auth.uid()` de la columna y la policy de INSERT comprueba que
coincida. Un dato menos que puede llegar mal.

**El perfil lo crea la base, no la app.**
Un trigger sobre `auth.users` crea el perfil y siembra las categorías. Si lo hiciera el
cliente, una app que se cierra entre el registro y la primera pantalla dejaría la cuenta a
medias, y el registro con Google —que ocurre en el navegador, fuera de la app— no tendría
ningún momento donde ejecutarlo.

**No hay parpadeo de login.**
Mientras no se sepa si hay sesión guardada no se dibuja ninguna de las dos navegaciones.
`AuthProvider` empieza en `loading` y el layout raíz muestra la pantalla de arranque hasta
que responde.

**Los providers de datos se montan dentro de la sesión, y con `key` del usuario.**
Si vivieran arriba, pedirían tareas antes de saber de quién son; sin el `key`, al cambiar
de cuenta el dashboard mostraría las del usuario anterior hasta que terminara la consulta.

**PKCE, no flujo implícito.**
En móvil el token no puede viajar en la URL sin que cualquier app registrada para el mismo
esquema pueda leerlo. Con PKCE vuelve un código de un solo uso que solo sirve acompañado
del verificador guardado en este dispositivo. Su contrapartida: **el enlace del correo de
recuperación hay que abrirlo en el mismo teléfono desde el que se pidió.**

**Y PKCE necesita WebCrypto, que React Native no trae.**
Hermes no implementa `crypto`, y ni React Native ni el runtime «winter» de Expo lo
definen como global. `@supabase/auth-js` no falla cuando no lo encuentra: se degrada en
dos sitios a la vez. El `code_verifier` —el secreto del que depende toda la seguridad de
PKCE— pasa a generarse con `Math.random()`, y el `code_challenge` cae de `sha256` a
`plain`. Solo lo segundo avisa por consola; lo primero, que es lo grave, es silencioso.

`src/lib/webCryptoPolyfill.ts` cubre el hueco con `expo-crypto`, que ya era dependencia.
Nada de esto lo detecta el compilador: `expo/tsconfig.base` incluye la librería `DOM`, así
que TypeScript da por hecho que `crypto` existe. **Los tipos del DOM describen un
navegador, no este runtime.**

**Se pide la contraseña actual para cambiarla, aunque Supabase no lo exija.**
Con una sesión válida basta para llamar a `updateUser`. Pero un teléfono desbloqueado *es*
una sesión válida, y sin ese paso cualquiera que lo tuviera en la mano cinco minutos podría
quedarse con la cuenta.

**Ningún mensaje de Supabase llega a una pantalla.**
`features/auth/authErrors.ts` y `repositories/supabase/rows.ts` traducen por código de
error. El usuario lee qué hacer; el stack va a consola.

**El orden de lectura de tareas y actividades se calcula en JavaScript.**
En SQLite era un `ORDER BY` con expresiones `CASE`. PostgREST no admite expresiones en
`order`, y el orden alfabético de la columna no sirve: pondría `completed` antes que
`pending` y la prioridad en `high, low, medium`. Se ordena en el repositorio, que es
aceptable porque estas listas se leen enteras y no hay paginación cuyo orden pudiera
romperse.

**IDs UUID y fechas ISO en UTC.**
Se decidió cuando todo era local, y es la razón de que la migración a Postgres no
necesitara reasignar un solo identificador.

**El estado de pago se calcula, no se guarda.**
Un `payment_status` almacenado quedaría obsoleto en cuanto pasara la fecha sin abrir la
app, y la card mostraría «Pagada» sobre una membresía vencida.

**Las imágenes se guardan por clave relativa, no por URI absoluta.**
En iOS la ruta del contenedor incluye un UUID que cambia al actualizar la app. Se guarda
`activity-images/<id>.jpg` y se resuelve al mostrar. Esa misma clave servirá como ruta de
bucket en Supabase Storage.

**Negro y amarillo, con los colores del propio logo.**
`#FDC305` y `#FD731D` se extrajeron de los píxeles de `assets/images/logo.png` y de la
mascota. Los colores *funcionales* se conservan tal cual: comunican significado, y teñirlos
de amarillo haría la información más difícil de leer.

**PAD forma parte del acceso, no solo del dashboard.**
Bienvenida, login, registro y recuperación usan las ilustraciones que ya existían
(`welcome`, `dance`, `hobby`, `study`). No se creó ningún asset nuevo.

**Configuración no es una pestaña.**
Seis pestañas aprietan demasiado las etiquetas en un iPhone. Vive en `/settings`, detrás
del engranaje del dashboard.

---

## Modelo de datos

```text
auth.users ──── profiles          (mismo UUID, ON DELETE CASCADE)
     │
     └─< user_id en todas las tablas de abajo

Category ──┬─< Activity ──┬─< Payment
           │              └─< Reminder  (targetType: 'payment' | 'activity')
           └─< Task ────────< Reminder  (targetType: 'task')

Activity ──< ActivityEvent     (kind: training | match)

FinanceEntry                   (kind: income | expense | debt | saving)

Routine ──< RoutineItem        (esquema listo, UI pendiente)
```

Los tipos viven en `src/types/models.ts`, el esquema de Postgres en
`supabase/migrations/` y su descripción para TypeScript en `src/lib/database.types.ts`.

`Reminder` es polimórfico a propósito (`targetType` + `targetId`): así un recordatorio
puede colgar de una tarea, un pago o, más adelante, de una rutina sin cambiar el esquema.

### Qué sigue siendo local

| Dato | Dónde | Por qué |
| --- | --- | --- |
| Moneda | SQLite | Preferencia del teléfono |
| Saludo de PAD visto | SQLite | Estado de este dispositivo |
| Sesión | `expo-sqlite/kv-store` | La gestiona Supabase Auth |
| Fotos de actividades | Sistema de archivos | Storage aún no está implementado |
| `notificationId` | Se sincroniza, pero solo vale aquí | Es un handle del sistema operativo |

Las dos últimas tienen consecuencias visibles y conviene tenerlas presentes: al reinstalar
la app **las actividades vuelven, pero sin sus fotos**, y **los recordatorios aparecen en
la lista pero hay que reprogramarlos** para que suenen.

### Datos que ya había en el teléfono

Launchpad funcionó meses sin cuentas. La primera vez que inicias sesión,
`features/auth/localImportService.ts` sube a tu cuenta lo que hubiera en SQLite, con una
pantalla que te dice qué se subió.

**No borra nada local**: sube una copia. Si algo falla, lo peor que pasa es que haya que
repetirlo; nunca que los datos originales hayan desaparecido. Se ejecuta una sola vez y
solo para la primera cuenta que entre en ese teléfono: una segunda cuenta no hereda los
datos de la primera.

### Cambiar el esquema

Hay dos bases y cada una tiene su procedimiento. Nunca se edita una migración ya
ejecutada: se agrega la siguiente.

- **Postgres** (los datos): ver [`supabase/README.md`](supabase/README.md).
- **SQLite** (las preferencias): crea `src/database/migrations/005_lo_que_sea.ts` y
  añádela al array `MIGRATIONS`.

---

## Google y correo con la misma dirección

El caso: alguien se registra con correo y después pulsa «Continuar con Google» usando esa
misma dirección.

Supabase guarda una **identidad por proveedor** dentro de un mismo usuario. Cuando el
correo de la cuenta existente está **confirmado** y el proveedor entrega un correo
verificado —Google lo hace—, Supabase **enlaza la identidad de Google a la cuenta que ya
existía**. Mismo UUID, mismo perfil, mismos datos. La app lo refleja: «Mi cuenta» muestra
los dos métodos de acceso y sigue ofreciendo el cambio de contraseña.

El caso que sí puede duplicar cuentas es que la cuenta de correo **nunca se confirmara**.
Por eso conviene una de estas dos configuraciones, y no un punto intermedio:

- **Confirm email activado** — la cuenta de correo se confirma antes de existir del todo.
- **Confirm email desactivado** — las cuentas se crean ya confirmadas.

En ambos casos el enlace funciona. **La app no intenta fusionar cuentas por su cuenta**, y
no debería: unir dos usuarios por parecerse el correo es exactamente el agujero por el que
se roban cuentas. Si algún día llegaran a existir dos, se resuelven en el panel de
Supabase.

`hasPassword` (en `useAuth()`) distingue los dos casos: a quien solo ha entrado con Google
no se le ofrece cambiar una contraseña que nunca tuvo.

---

## Notificaciones y Expo Go

Launchpad usa **solo notificaciones locales** (las programa el propio teléfono), y eso
**funciona en Expo Go** sin ningún paso extra.

Compruébalo desde **Configuración → Enviar notificación de prueba**: llega a los 5
segundos.

Lo que **no** funciona en Expo Go son las notificaciones *push remotas*. Launchpad no las
necesita hoy, aunque ahora que hay servidor son la forma correcta de resolver los
recordatorios entre dispositivos.

---

## Qué está hecho

- [x] Cuenta de usuario: registro, inicio de sesión y sesión persistente
- [x] Continuar con Google (OAuth + PKCE + deep linking)
- [x] Recuperación y cambio de contraseña
- [x] Bienvenida, Login y Registro con la identidad de Launchpad y con PAD
- [x] Mi cuenta: perfil, método de acceso, cerrar sesión
- [x] Todos los datos en PostgreSQL, aislados por Row Level Security
- [x] Migración automática de los datos que ya había en el teléfono
- [x] Los datos vuelven tras borrar y reinstalar la app
- [x] Dashboard con progreso del día, tareas, actividades y avisos de pago
- [x] Tareas: crear, editar, completar, eliminar, prioridad, categoría, fecha y hora
- [x] Actividades: crear, editar, eliminar, imagen, días, horario, estado
- [x] Detalle de actividad con registro de pagos e historial
- [x] Recordatorios locales para tareas y vencimientos de pago
- [x] Alcancía: ingresos fijos, gastos fijos, deudas, ahorros y control mensual
- [x] Deportes con ilustración propia de PAD y calendario de entrenamientos
- [x] Identidad visual negro/amarillo y barra de pestañas flotante

## Qué sigue

- Supabase Storage para el avatar y las fotos de actividades (hoy siguen siendo locales)
- Reprogramar los recordatorios al entrar en un dispositivo nuevo
- Cache offline: leer de SQLite y sincronizar al recuperar la conexión
- Development build para dejar de depender de `exp://` en los enlaces
- Módulo de rutinas (el esquema ya existe, falta la UI)
- Vista jerárquica del módulo académico (universidad → materia → tarea)
- Estadísticas e historial de hábitos
- Categorías creadas por el usuario
- Pruebas automatizadas de los `selectors` y los servicios
- ESLint (`npx expo lint`) si el proyecto crece
