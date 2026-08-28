# Base de datos de Launchpad

Todo lo que Launchpad guarda en la nube está definido aquí. Las migraciones son la
**fuente de verdad** del esquema: `src/lib/database.types.ts` solo lo describe para
TypeScript, y cambiarlo no cambia nada en la base.

```text
migrations/
├── 20260827120000_helpers.sql              set_updated_at()
├── 20260827120100_profiles.sql             profiles (mismo UUID que auth.users)
├── 20260827120200_core_schema.sql          las 9 tablas de datos
├── 20260827120300_row_level_security.sql   RLS, policies y grants
├── 20260827120400_new_user_bootstrap.sql   perfil + categorías al crear la cuenta
└── 20260827120500_delete_my_data.sql       "Borrar todos los datos"
```

El orden importa: las policies necesitan que las tablas existan, y el trigger de alta
necesita que exista `categories`.

---

## Aplicarlas

### Opción A — SQL Editor (lo más rápido para empezar)

Abre tu proyecto en Supabase → **SQL Editor** → pega el contenido de cada archivo **en
orden** y ejecuta. Son seis pegadas.

### Opción B — Supabase CLI (lo que conviene si el proyecto sigue creciendo)

```bash
npm install --save-dev supabase
npx supabase login
npx supabase link --project-ref <tu-project-ref>
npx supabase db push
```

`db push` aplica solo lo que falta y lleva la cuenta de lo aplicado, así que puede
ejecutarse tantas veces como haga falta.

> El `project-ref` es la parte que va antes de `.supabase.co` en la URL de tu proyecto.

---

## Cómo cambiar el esquema

Nunca se edita una migración ya ejecutada: se agrega la siguiente.

1. Crea `supabase/migrations/<AAAAMMDDHHMMSS>_lo_que_sea.sql`.
2. Si la tabla es nueva y guarda datos del usuario, **no olvides las cuatro cosas**:
   - columna `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`
   - `alter table ... enable row level security`
   - las cuatro policies (SELECT, INSERT, UPDATE, DELETE)
   - los grants a `authenticated` y el `revoke` a `anon`
3. Actualiza `src/lib/database.types.ts` para que TypeScript lo sepa.
4. Aplícala.

---

## Row Level Security

Es lo único que separa los datos de una cuenta de los de otra.

La app móvil lleva la clave publicable dentro del binario: cualquiera puede extraerla y
hablar con la API directamente. **La seguridad no puede estar en el cliente.** Está en
las policies.

Para comprobar que están puestas:

```sql
-- Ninguna tabla debería aparecer con rowsecurity = false.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public';

-- Cada tabla de datos debería tener cuatro policies.
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

Y para comprobar que funcionan de verdad, crea dos cuentas, mete datos con la primera e
intenta leerlos con la segunda: la lista tiene que salir vacía.

---

## Configuración del panel

Estas cosas **no** viven en las migraciones porque son ajustes del proyecto, no del
esquema. Están documentadas en el `README.md` de la raíz, sección «Supabase»:

- Authentication → URL Configuration → **Redirect URLs**
- Authentication → Providers → **Email** (confirmación de correo)
- Authentication → Providers → **Google** (client ID y secret)

Si clonas este proyecto en otro entorno de Supabase, esos tres pasos hay que repetirlos
a mano.
