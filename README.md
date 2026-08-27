# Launchpad

Aplicación móvil personal de organización: tareas, actividades (gimnasio, materias, hobbies),
recordatorios locales y control económico básico de cada actividad.

Todo funciona **100 % local**. No hay backend, cuentas ni sincronización.

---

## Cómo ejecutarla

```bash
npm install
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

---

## Stack

| Pieza | Elección |
| --- | --- |
| Framework | Expo SDK 54 · React Native 0.81 |
| Lenguaje | TypeScript en modo estricto |
| iOS mínimo | 15.1 (requisito de Expo Go para SDK 54) |
| Navegación | Expo Router (rutas por archivos, en `src/app/`) |
| Persistencia | `expo-sqlite` con migraciones versionadas |
| Notificaciones | `expo-notifications` (solo locales) |
| Imágenes | `expo-image-picker` + `expo-file-system` |
| Estado | React Context + hooks (sin librería externa) |
| Degradados | `expo-linear-gradient` |

### Por qué SDK 54 y no el último

Expo Go solo soporta **una** versión de SDK a la vez, y la App Store entrega la
Expo Go más nueva **compatible con el iOS del teléfono**. El iPhone de pruebas
corre un iOS anterior a 16.4, que es lo que exige el SDK 57, así que su Expo Go
se queda en SDK 54 y un proyecto en 57 le da *«Project is incompatible with this
version of Expo Go»*.

El proyecto está fijado a SDK 54 por esa razón, no por una limitación técnica: el
código no usa ninguna API exclusiva de versiones posteriores (el salto 54 → 57 se
hizo y se deshizo sin tocar una sola línea de `src/`).

> ⚠️ **Actualizar el iOS y subir el SDK son la misma tarea.**
> Expo Go soporta un solo SDK a la vez. En cuanto actualices el iOS, Expo Go
> saltará al SDK más nuevo y este proyecto dejará de abrir con el mismo error,
> pero invertido. Haz las dos cosas en la misma sesión.

**Para subir de SDK:** actualiza el iOS del teléfono, reinstala Expo Go y luego:

```bash
npx expo install expo@latest
npx expo install --fix
npm run typecheck
npx expo start --clear
```

El salto 54 → 57 se probó y no requirió ningún cambio en `src/`. La app habla con
sus propias interfaces (`repositories`, `services`, `theme`), no con APIs del SDK,
así que las migraciones de versión deberían seguir siendo baratas.

---

## Estructura

```text
src/
├── app/                 Rutas de Expo Router (una pantalla = un archivo)
│   ├── (tabs)/          Inicio · Ejercicio · Académico · Hobbies · Tareas
│   ├── activity/        Detalle, creación y edición de actividades
│   ├── finance/         Alcancía y sus formularios
│   ├── task/            Creación y edición de tareas
│   ├── onboarding.tsx
│   └── settings.tsx
│
├── components/          Componentes sin lógica de negocio
│   ├── ui/              Card, Button, Badge, Text, ListRow, estados…
│   ├── form/            Campos de formulario
│   └── navigation/      BubbleTabBar (barra flotante con burbuja)
│
├── features/            Un módulo por dominio funcional
│   ├── activities/      Ejercicio + Académico + Hobbies (misma entidad)
│   ├── tasks/
│   ├── dashboard/
│   ├── finance/         Alcancía: ingresos, gastos, deudas y ahorros
│   ├── welcome/         Bienvenida con la mascota
│   └── notifications/
│
├── database/            Persistencia
│   ├── migrations/      Cambios de esquema versionados
│   ├── repositories/    Acceso a datos detrás de interfaces
│   ├── database.ts      Conexión única
│   └── sql.ts           Utilidades de mapeo
│
├── services/            Servicios transversales (notificaciones, imágenes)
├── providers/           Contextos globales (base de datos, preferencias)
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
Pantalla  →  Provider  →  Service  →  Repository  →  SQLite
 (UI)        (estado)     (reglas)    (interfaz)     (datos)
```

Cada capa tiene una responsabilidad y ninguna se salta a la siguiente.
En concreto: **ninguna pantalla escribe SQL**, y ningún repositorio conoce reglas
de negocio.

### Decisiones que conviene conocer

**Una sola entidad `Activity` para tres módulos.**
Ejercicio, Académico y Hobbies tienen la misma forma (imagen, categoría, días,
horario, estado, pagos). Se distinguen con el campo `domain`. Las tres pantallas
son el mismo componente (`ActivityDomainScreen`) configurado desde
`constants/domains.ts`. Agregar un módulo nuevo son dos cosas: una entrada en ese
archivo y una ruta de cuatro líneas.

**Los repositorios están detrás de interfaces.**
`database/repositories/types.ts` define los contratos; `repositories/index.ts` decide
qué implementación se usa. Cuando entre Firebase, se escribe un
`firestoreTaskRepository` que cumpla `TaskRepository` y se cambia ese único
archivo. Servicios y pantallas no se enteran.

**IDs UUID y fechas ISO en UTC.**
No se usan enteros autoincrementales. Es la decisión que, tomada al revés,
obligaría a migrar todos los datos el día que exista sincronización.

**El estado de pago se calcula, no se guarda.**
Un `payment_status` almacenado quedaría obsoleto en cuanto pasara la fecha sin
abrir la app, y la card mostraría «Pagada» sobre una membresía vencida.
`getPaymentStatus()` lo deriva de `nextPaymentDate` cada vez que se pinta.

**Las imágenes se guardan por clave relativa, no por URI absoluta.**
En iOS la ruta del contenedor de la app incluye un UUID que cambia al
actualizarla. Se guarda `activity-images/<id>.jpg` y se resuelve al mostrar con
`imageStorage.resolve()`. Esa misma clave servirá como ruta de bucket en Firebase
Storage.

**Negro y amarillo, con los colores del propio logo.**
`#FDC305` y `#FD731D` no se eligieron a ojo: se extrajeron de los píxeles de
`assets/images/logo.png` y de la mascota. Los colores *funcionales* (prioridad,
estado de pago, éxito/error) se conservan tal cual: comunican significado, y
teñirlos de amarillo por coherencia visual haría la información más difícil de
leer. Ver `src/theme/colors.ts`.

**Las imágenes se registran en un solo archivo.**
Metro exige que `require()` reciba una cadena literal, así que las rutas no se
pueden construir dinámicamente. Todas viven en `src/constants/assets.ts`, y las
pantallas usan `logo` o `mascot.<clave>`.

**El deporte se guarda como texto y se valida al leer.**
`Activity.sportKey` no está restringido por la base. Agregar un deporte nuevo es
añadir una entrada a `constants/sports.ts` y su imagen; no hace falta otra
migración. `parseSportKey()` descarta lo que ya no exista.

**Cada deporte tiene su propio vocabulario.**
En fútbol se juegan partidos, en natación se compite y en boxeo se pelea. Ese
texto vive en `SportConfig.matchLabel`, junto con la frase de PAD. Es lo que hace
que la app se sienta hecha para tu deporte y no un formulario genérico.

**Los entrenamientos se generan solos, pero acotados.**
Al crear una actividad con días marcados, la app rellena el calendario con esos
entrenamientos durante **un ciclo de cobro** (mensual = un mes) y se detiene. Un
calendario que se repite hasta el infinito deja de ser información. Los días
generados llevan `isGenerated`, así que al cambiar el horario se rehacen solo
ellos —de hoy en adelante— y los partidos y días extra del usuario sobreviven.
Editar el nombre no regenera nada: se compara una firma de los campos que
realmente definen el horario.

**El control mensual guarda el mes, no un booleano.**
`FinanceEntry.lastSettledMonth` almacena `'2026-08'`. Comparándolo con el mes en
curso, el control se reinicia solo al cambiar de mes: no hace falta ninguna tarea
programada que limpie banderas, ni que la app se abra el día 1.

**Las ilustraciones se guardan a 512 px.**
En pantalla se dibujan entre 72 y 140 px. Los originales rondaban los 1300 px y
pesaban 12 MB en total, lo que hacía visible la carga en Expo Go; a 512 px pesan
2,5 MB y se ven igual. Se redujeron con `zlib` puro, sin agregar dependencias.

**Configuración no es una pestaña.**
Seis pestañas aprietan demasiado las etiquetas en un iPhone. Vive en `/settings`,
detrás del engranaje del dashboard, que es la sección que menos se abre.

---

## Modelo de datos

```text
Category ──┬─< Activity ──┬─< Payment
           │              └─< Reminder  (targetType: 'payment' | 'activity')
           └─< Task ────────< Reminder  (targetType: 'task')

Activity ──< ActivityEvent     (kind: training | match)

FinanceEntry                   (kind: income | expense | debt | saving)

Routine ──< RoutineItem        (esquema listo, UI pendiente)
```

Los tipos viven en `src/types/models.ts` y el esquema SQL en
`src/database/migrations/001_initial.ts`.

`Reminder` es polimórfico a propósito (`targetType` + `targetId`): así un
recordatorio puede colgar de una tarea, un pago o, más adelante, de una rutina
o un hábito sin cambiar el esquema.

### Cambiar el esquema

Nunca se edita una migración ya ejecutada: se agrega la siguiente.

1. Crea `src/database/migrations/002_lo_que_sea.ts` siguiendo el formato de la 001.
2. Añádela al array `MIGRATIONS` en `migrations/index.ts`.
3. Al abrir la app, `PRAGMA user_version` detecta el salto y la aplica dentro de
   una transacción: si falla, revierte entera y la versión no avanza.

---

## Notificaciones y Expo Go

Launchpad usa **solo notificaciones locales** (las programa el propio teléfono),
y eso **funciona en Expo Go** sin ningún paso extra.

Compruébalo desde **Configuración → Enviar notificación de prueba**: llega a los
5 segundos.

Lo que **no** funciona en Expo Go son las notificaciones *push remotas* (las que
envía un servidor). Launchpad no las necesita hoy. Si algún día se quisieran
—por ejemplo, para avisos entre dispositivos— haría falta un *development build*
(`npx expo run:ios`), lo que a su vez requiere macOS o EAS Build. Mientras eso no
ocurra, Expo Go es suficiente.

---

## Qué está hecho

- [x] Bienvenida (se recuerda que ya la viste)
- [x] Dashboard con progreso del día, tareas de hoy, actividades de hoy y avisos de pago
- [x] Tareas: crear, editar, completar, eliminar, prioridad, categoría, fecha y hora
- [x] Actividades: crear, editar, eliminar, imagen, días, horario, estado
- [x] Detalle de actividad con registro de pagos e historial
- [x] Recordatorios locales para tareas y vencimientos de pago
- [x] Configuración: nombre, moneda, notificaciones, borrado de datos
- [x] Persistencia en SQLite con migraciones
- [x] Identidad visual negro/amarillo con degradados de marca
- [x] Barra de pestañas flotante con burbuja deslizante
- [x] Bienvenida animada con la mascota
- [x] Alcancía: ingresos fijos, gastos fijos, deudas, ahorros y control mensual
- [x] Deportes con ilustración propia de PAD y calendario de entrenamientos y competencias

## Qué sigue

- Módulo de rutinas (el esquema ya existe, falta la UI)
- Recordatorios automáticos de los días anotados en el calendario
- Rellenar otro ciclo de entrenamientos cuando se registra el pago siguiente
- Vista jerárquica del módulo académico (universidad → materia → tarea)
- Estadísticas e historial de hábitos
- Categorías creadas por el usuario
- Pruebas automatizadas de los `selectors` y los servicios
- ESLint (`npx expo lint`) si el proyecto crece
- Firebase: autenticación, Firestore y Storage, sustituyendo los repositorios
