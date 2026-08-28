import { sqliteRepositories } from './sqlite';
import { supabaseRepositories } from './supabase';
import type { RepositoryRegistry } from './types';

/**
 * Punto unico de conexion entre la logica de negocio y la persistencia.
 *
 * Este archivo es exactamente lo que el README anticipaba: el dia que entrara
 * un backend, se escribiria una implementacion que cumpliera los mismos
 * contratos y se cambiaria una sola linea. Ese dia llego, y la promesa se
 * cumplio: ni un servicio ni una pantalla se enteraron del cambio.
 *
 * El reparto de hoy:
 *
 *   Datos del usuario  ->  Supabase (PostgreSQL + RLS)
 *   Preferencias       ->  SQLite local
 *
 * `settings` se queda en el telefono porque lo que guarda pertenece al
 * dispositivo, no a la cuenta: si ya viste la bienvenida de PAD, la moneda que
 * elegiste. Subirlo obligaria a resolver conflictos entre dispositivos para no
 * ganar nada.
 *
 * Consecuencia que conviene tener presente: Supabase es ahora la fuente de
 * verdad, asi que la app necesita conexion para leer y escribir. No hay cache
 * offline todavia --era la opcion mas simple y segura para esta etapa-- pero
 * la arquitectura la admite sin tocar pantallas: un repositorio que consulte
 * primero SQLite y luego Supabase se enchufa aqui mismo.
 */
export const repositories: RepositoryRegistry = {
  ...supabaseRepositories,
  settings: sqliteRepositories.settings,
};

/**
 * Repositorios locales, accesibles aparte.
 *
 * Los usa la importacion de datos previos (`features/auth/localImportService`),
 * que necesita leer de SQLite y escribir en Supabase a la vez. Ninguna
 * pantalla debe importarlos: el resto de la app habla con `repositories`.
 */
export { sqliteRepositories } from './sqlite';

export { supabaseMaintenanceRepository, supabaseProfileRepository } from './supabase';
export type { ProfilePatch } from './supabase';

export type {
  ActivityEventRepository,
  ActivityFilter,
  ActivityRepository,
  CategoryRepository,
  FinanceFilter,
  FinanceRepository,
  PaymentRepository,
  ReminderRepository,
  RepositoryRegistry,
  SettingsRepository,
  TaskFilter,
  TaskRepository,
} from './types';
