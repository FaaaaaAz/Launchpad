import { sqliteActivityEventRepository } from './activityEventRepository';
import { sqliteActivityRepository } from './activityRepository';
import { sqliteCategoryRepository } from './categoryRepository';
import { sqliteFinanceRepository } from './financeRepository';
import { sqlitePaymentRepository } from './paymentRepository';
import { sqliteReminderRepository } from './reminderRepository';
import { sqliteSettingsRepository } from './settingsRepository';
import { sqliteTaskRepository } from './taskRepository';
import type { RepositoryRegistry } from './types';

/**
 * Punto único de conexión entre la lógica de negocio y la persistencia.
 *
 * Hoy todo apunta a SQLite. El día que entre Firebase, esta constante es el
 * único archivo que cambia: se sustituye una implementación por otra (o se
 * envuelve en una que escriba en ambos para sincronizar), y ni los servicios
 * ni las pantallas se enteran.
 */
export const repositories: RepositoryRegistry = {
  tasks: sqliteTaskRepository,
  activities: sqliteActivityRepository,
  activityEvents: sqliteActivityEventRepository,
  categories: sqliteCategoryRepository,
  finance: sqliteFinanceRepository,
  payments: sqlitePaymentRepository,
  reminders: sqliteReminderRepository,
  settings: sqliteSettingsRepository,
};

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
