import type { RepositoryRegistry } from '../types';

import { supabaseActivityEventRepository } from './activityEventRepository';
import { supabaseActivityRepository } from './activityRepository';
import { supabaseCategoryRepository } from './categoryRepository';
import { supabaseFinanceRepository } from './financeRepository';
import { supabasePaymentRepository } from './paymentRepository';
import { supabaseReminderRepository } from './reminderRepository';
import { supabaseTaskRepository } from './taskRepository';

/**
 * Implementacion sobre Supabase de los contratos de `repositories/types.ts`.
 *
 * No incluye `settings`: las preferencias del dispositivo (si ya viste la
 * bienvenida, la moneda elegida) no pertenecen a la cuenta sino al telefono, y
 * subirlas obligaria a decidir que gana cuando dos dispositivos discrepan
 * --una pregunta que hoy no hace falta responder--. Siguen en SQLite.
 */
export const supabaseRepositories: Omit<RepositoryRegistry, 'settings'> = {
  tasks: supabaseTaskRepository,
  activities: supabaseActivityRepository,
  activityEvents: supabaseActivityEventRepository,
  categories: supabaseCategoryRepository,
  finance: supabaseFinanceRepository,
  payments: supabasePaymentRepository,
  reminders: supabaseReminderRepository,
};

export { supabaseMaintenanceRepository } from './maintenance';
export { supabaseProfileRepository } from './profileRepository';
export type { ProfilePatch } from './profileRepository';
