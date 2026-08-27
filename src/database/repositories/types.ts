import type {
  Activity,
  ActivityDomain,
  ActivityEvent,
  ActivityStatus,
  Category,
  CreateInput,
  FinanceEntry,
  FinanceKind,
  DateOnly,
  ID,
  Payment,
  Reminder,
  ReminderTargetType,
  Task,
  TaskStatus,
  UpdateInput,
} from '@/types';

/**
 * Contratos de persistencia.
 *
 * La app entera (servicios, hooks, pantallas) depende SOLO de estas
 * interfaces, nunca de SQLite directamente. Cuando llegue Firebase, se escribe
 * un `firestoreTaskRepository` que cumpla `TaskRepository` y se cambia una
 * línea en `repositories/index.ts`; nada más se toca.
 *
 * Por eso las firmas no exponen nada específico de SQL: ni transacciones,
 * ni cursores, ni filas.
 */

export interface TaskFilter {
  status?: TaskStatus;
  categoryId?: ID;
  activityId?: ID;
  /** Incluye tareas cuya fecha límite sea igual o anterior a esta. */
  dueOnOrBefore?: DateOnly;
}

export interface TaskRepository {
  list(filter?: TaskFilter): Promise<Task[]>;
  findById(id: ID): Promise<Task | null>;
  create(input: CreateInput<Task>): Promise<Task>;
  update(id: ID, patch: UpdateInput<Task>): Promise<Task>;
  remove(id: ID): Promise<void>;
}

export interface ActivityFilter {
  domain?: ActivityDomain;
  status?: ActivityStatus;
  /** Excluye las archivadas. Por defecto true en las pantallas de módulo. */
  excludeArchived?: boolean;
}

export interface ActivityRepository {
  list(filter?: ActivityFilter): Promise<Activity[]>;
  findById(id: ID): Promise<Activity | null>;
  create(input: CreateInput<Activity>): Promise<Activity>;
  update(id: ID, patch: UpdateInput<Activity>): Promise<Activity>;
  remove(id: ID): Promise<void>;
}

export interface ActivityEventRepository {
  listByActivity(activityId: ID): Promise<ActivityEvent[]>;
  /** Inserta varios días de una vez, dentro de una sola transacción. */
  createMany(inputs: CreateInput<ActivityEvent>[]): Promise<void>;
  /** Borra los días generados por la app desde una fecha en adelante. */
  removeGeneratedFrom(activityId: ID, from: DateOnly): Promise<void>;
  /** Próximo evento de cada actividad, indexado por actividad. */
  listNextByActivity(): Promise<Map<ID, ActivityEvent>>;
  findById(id: ID): Promise<ActivityEvent | null>;
  create(input: CreateInput<ActivityEvent>): Promise<ActivityEvent>;
  update(id: ID, patch: UpdateInput<ActivityEvent>): Promise<ActivityEvent>;
  remove(id: ID): Promise<void>;
}

export interface CategoryRepository {
  /** `domain: null` devuelve las categorías de tareas. */
  list(domain?: ActivityDomain | null): Promise<Category[]>;
  findById(id: ID): Promise<Category | null>;
  create(input: CreateInput<Category>): Promise<Category>;
  remove(id: ID): Promise<void>;
}

export interface PaymentRepository {
  listByActivity(activityId: ID): Promise<Payment[]>;
  create(input: CreateInput<Payment>): Promise<Payment>;
  remove(id: ID): Promise<void>;
}

export interface ReminderRepository {
  list(): Promise<Reminder[]>;
  listUpcoming(limit?: number): Promise<Reminder[]>;
  listByTarget(targetType: ReminderTargetType, targetId: ID): Promise<Reminder[]>;
  findById(id: ID): Promise<Reminder | null>;
  create(input: CreateInput<Reminder>): Promise<Reminder>;
  update(id: ID, patch: UpdateInput<Reminder>): Promise<Reminder>;
  remove(id: ID): Promise<void>;
}

export interface FinanceFilter {
  kind?: FinanceKind;
  /** Excluye los movimientos archivados. */
  onlyActive?: boolean;
}

export interface FinanceRepository {
  list(filter?: FinanceFilter): Promise<FinanceEntry[]>;
  findById(id: ID): Promise<FinanceEntry | null>;
  create(input: CreateInput<FinanceEntry>): Promise<FinanceEntry>;
  update(id: ID, patch: UpdateInput<FinanceEntry>): Promise<FinanceEntry>;
  remove(id: ID): Promise<void>;
}

/** Almacén clave/valor para preferencias locales. */
export interface SettingsRepository {
  getAll(): Promise<Record<string, string>>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Conjunto de repositorios que consume la capa de servicios. */
export interface RepositoryRegistry {
  tasks: TaskRepository;
  activities: ActivityRepository;
  activityEvents: ActivityEventRepository;
  categories: CategoryRepository;
  finance: FinanceRepository;
  payments: PaymentRepository;
  reminders: ReminderRepository;
  settings: SettingsRepository;
}
