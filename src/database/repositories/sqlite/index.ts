import type { RepositoryRegistry } from '../types';

import { sqliteActivityEventRepository } from './activityEventRepository';
import { sqliteActivityRepository } from './activityRepository';
import { sqliteCategoryRepository } from './categoryRepository';
import { sqliteFinanceRepository } from './financeRepository';
import { sqlitePaymentRepository } from './paymentRepository';
import { sqliteReminderRepository } from './reminderRepository';
import { sqliteSettingsRepository } from './settingsRepository';
import { sqliteTaskRepository } from './taskRepository';

/**
 * Implementacion local, en el propio telefono.
 *
 * Desde que Supabase es la fuente de verdad de los datos del usuario, de aqui
 * solo sigue en uso `settings` (las preferencias del dispositivo). El resto se
 * conserva por dos razones concretas, no por nostalgia:
 *
 * 1. La migracion de datos. `features/auth/localImportService.ts` lee de estos
 *    repositorios para subir a la cuenta lo que ya existia en el telefono.
 *
 * 2. Es la unica vuelta atras posible. Si Supabase resultara ser un error,
 *    revertir es cambiar una linea en `repositories/index.ts`.
 *
 * Cuando la migracion se haya ejecutado en todos los dispositivos que
 * importan, esta carpeta puede reducirse a `settingsRepository`.
 */
export const sqliteRepositories: RepositoryRegistry = {
  tasks: sqliteTaskRepository,
  activities: sqliteActivityRepository,
  activityEvents: sqliteActivityEventRepository,
  categories: sqliteCategoryRepository,
  finance: sqliteFinanceRepository,
  payments: sqlitePaymentRepository,
  reminders: sqliteReminderRepository,
  settings: sqliteSettingsRepository,
};

export { sqliteSettingsRepository } from './settingsRepository';
