# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Launchpad — convenciones del proyecto

Aplicación personal local (sin backend). Ver `README.md` para la arquitectura completa.

## Reglas al escribir código aquí

- **Nunca SQL en una pantalla.** El flujo es `Pantalla → Provider → Service → Repository → SQLite`.
- **Nunca un color, tamaño de fuente o espaciado literal.** Todo sale de `src/theme`.
- **Nunca editar una migración ya aplicada.** Se agrega la siguiente en `src/database/migrations/`.
- **Nunca guardar un valor derivable.** El estado de pago se calcula con `getPaymentStatus()`.
- **Ejercicio, Académico y Hobbies son la misma entidad** (`Activity` + `domain`). No dupliques
  pantallas: configura `src/constants/domains.ts`.
- Los textos de la interfaz están en español.
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
