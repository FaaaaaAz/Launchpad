import type { DateOnly, Entity, ID, ISODateTime, TimeOfDay, Weekday } from './common';

/* -------------------------------------------------------------------------- */
/* Enumeraciones                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Dominio al que pertenece una actividad.
 *
 * Ejercicio, Académico y Hobbies comparten exactamente la misma forma
 * (card con imagen, categoría, días, horario, estado y datos de pago), así que
 * se modelan con UNA entidad discriminada por dominio en vez de tres entidades
 * casi idénticas. Agregar un dominio nuevo es agregar un valor aquí.
 */
export type ActivityDomain = 'exercise' | 'academic' | 'hobby';

export type ActivityStatus = 'active' | 'paused' | 'archived';

/** Ciclo de cobro de una actividad. 'none' = la actividad no cuesta dinero. */
export type BillingCycle = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'oneTime';

export type PaymentStatus = 'none' | 'paid' | 'due' | 'overdue';

export type TaskStatus = 'pending' | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high';

/** A qué entidad apunta un recordatorio. Permite recordatorios polimórficos. */
export type ReminderTargetType = 'task' | 'activity' | 'payment' | 'routine' | 'custom';

export type ReminderStatus = 'scheduled' | 'delivered' | 'cancelled';

export type ReminderRepeat = 'none' | 'daily' | 'weekly';

/**
 * Tipo de movimiento de la alcancía.
 *
 * Los cuatro comparten forma (nombre, monto, periodicidad), así que se modelan
 * con una sola entidad discriminada, igual que las actividades. Lo que cambia
 * es el significado del monto:
 * - `income` / `expense`: monto mensual.
 * - `debt` / `saving`: cuota o aporte mensual, más un total y un acumulado.
 */
export type FinanceKind = 'income' | 'expense' | 'debt' | 'saving';

/** Qué se anota en un día del calendario de una actividad. */
export type ActivityEventKind = 'training' | 'match';

/* -------------------------------------------------------------------------- */
/* Entidades                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Categoría reutilizable.
 * `domain: null` identifica a las categorías de tareas (que no pertenecen a
 * ningún módulo de actividades).
 */
export interface Category extends Entity {
  name: string;
  domain: ActivityDomain | null;
  color: string;
  icon: string | null;
  /** Las categorías del sistema vienen sembradas y no se pueden borrar. */
  isSystem: boolean;
}

/**
 * Una actividad recurrente del usuario: el gimnasio, una materia, un hobby.
 * Es la entidad central de los módulos Ejercicio / Académico / Hobbies.
 */
export interface Activity extends Entity {
  domain: ActivityDomain;
  name: string;
  /** Línea secundaria de la card. Ej: 'Smart Fit — Sucursal Norte'. */
  subtitle: string | null;
  categoryId: ID | null;
  /**
   * Referencia a la imagen dentro del almacenamiento, NO una URI absoluta.
   *
   * En iOS la ruta del contenedor de la app incluye un UUID que cambia al
   * actualizar la app, así que guardar la URI absoluta dejaría las fotos rotas.
   * Se guarda una clave relativa ('activity-images/<id>.jpg') y se resuelve al
   * mostrarla con `imageStorage.resolve()`. Cuando la imagen viva en Firebase
   * Storage, esta misma clave será la ruta del bucket.
   */
  imageKey: string | null;
  location: string | null;
  /**
   * Deporte de la actividad, cuando aplica (ver `constants/sports.ts`).
   *
   * Se guarda como texto libre y se valida al leer: así agregar un deporte
   * nuevo no obliga a migrar la base.
   */
  sportKey: string | null;
  status: ActivityStatus;
  /** Días en que ocurre la actividad. */
  weekdays: Weekday[];
  startTime: TimeOfDay | null;
  endTime: TimeOfDay | null;
  /** Inicio de la membresía / inscripción. */
  startDate: DateOnly | null;
  /** Vencimiento de la membresía / fin del curso. */
  endDate: DateOnly | null;
  notes: string | null;

  /* --- Bloque económico ---------------------------------------------------
   * Deliberadamente simple: el monto vive en la actividad y `payments`
   * guarda el historial. Suficiente para "mi mensualidad vence el 12" sin
   * construir todavía una app de finanzas.
   */
  billingCycle: BillingCycle;
  billingAmount: number | null;
  currency: string;
  lastPaymentDate: DateOnly | null;
  nextPaymentDate: DateOnly | null;
}

/**
 * Un día anotado en el calendario de una actividad: un entrenamiento o una
 * competencia.
 */
export interface ActivityEvent extends Entity {
  activityId: ID;
  date: DateOnly;
  kind: ActivityEventKind;
  /** Detalle corto: 'vs. Rojos', 'Test de 5k'. */
  title: string | null;
  notes: string | null;
  /** Si ya se cumplió. Permite ver la constancia del mes de un vistazo. */
  completed: boolean;
}

/** Un pago concreto realizado sobre una actividad. */
export interface Payment extends Entity {
  activityId: ID;
  amount: number;
  currency: string;
  paidAt: DateOnly;
  /** Hasta cuándo cubre este pago. */
  coversUntil: DateOnly | null;
  notes: string | null;
}

export interface Task extends Entity {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: DateOnly | null;
  dueTime: TimeOfDay | null;
  categoryId: ID | null;
  /** Vincula la tarea a una actividad. Ej: 'Renovar membresía' -> Gimnasio. */
  activityId: ID | null;
  completedAt: ISODateTime | null;
}

/**
 * Recordatorio local. Se apoya en expo-notifications.
 * `notificationId` es el handle devuelto por el sistema operativo; se guarda
 * para poder cancelar o reprogramar la notificación.
 */
export interface Reminder extends Entity {
  targetType: ReminderTargetType;
  targetId: ID | null;
  title: string;
  body: string | null;
  scheduledAt: ISODateTime;
  repeat: ReminderRepeat;
  notificationId: string | null;
  status: ReminderStatus;
}

/**
 * Movimiento fijo de la alcancía: un sueldo, un alquiler, una deuda, una meta
 * de ahorro.
 */
export interface FinanceEntry extends Entity {
  kind: FinanceKind;
  name: string;
  /** Monto mensual: sueldo, gasto, cuota o aporte. */
  amount: number;
  currency: string;
  /** Solo deudas y ahorros: total a pagar o meta a alcanzar. */
  targetAmount: number | null;
  /** Solo deudas y ahorros: cuánto se lleva pagado o ahorrado. */
  settledAmount: number | null;
  /** Día del mes en que corresponde (1-31). */
  dueDay: number | null;
  /**
   * Último mes marcado como cubierto, en formato 'YYYY-MM'.
   *
   * Guardar el mes (y no un booleano) hace que el control mensual se reinicie
   * solo al cambiar de mes, sin necesidad de una tarea programada que limpie
   * banderas.
   */
  lastSettledMonth: string | null;
  notes: string | null;
  isActive: boolean;
}

/**
 * Rutina: una secuencia ordenada de pasos con hora.
 * El esquema ya existe para que el módulo se construya encima sin migrar
 * datos; la UI llegará en una iteración posterior.
 */
export interface Routine extends Entity {
  name: string;
  domain: ActivityDomain | null;
  weekdays: Weekday[];
  isActive: boolean;
}

export interface RoutineItem extends Entity {
  routineId: ID;
  title: string;
  time: TimeOfDay | null;
  durationMinutes: number | null;
  position: number;
  notes: string | null;
}
