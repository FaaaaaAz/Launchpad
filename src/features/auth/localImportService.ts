import { repositories, sqliteRepositories } from '@/database';
import type { Category, ID } from '@/types';

/**
 * Traslado de los datos que ya existian en el telefono a la cuenta.
 *
 * Launchpad funciono meses sin cuenta: puede haber tareas, actividades, pagos
 * y una alcancia entera guardados en SQLite. Al aparecer la autenticacion, esos
 * datos no pueden simplemente dejar de verse.
 *
 * Reglas que sigue este modulo:
 *
 * * NO borra nada local. Sube una copia. Si algo sale mal a medias, lo peor
 *   que puede pasar es que haya que repetirlo o limpiar duplicados a mano;
 *   nunca que los datos originales hayan desaparecido. Borrar la copia local
 *   es una accion aparte y explicita, en Configuracion.
 *
 * * Se ejecuta UNA vez y para el primer usuario que entre en este telefono.
 *   Si mas tarde entra otra cuenta, no hereda los datos de la anterior: eso
 *   seria una fuga entre cuentas dentro del mismo dispositivo.
 *
 * * Va en orden de dependencias --categorias, actividades, y despues lo que
 *   las referencia-- reescribiendo los identificadores por el camino. Los IDs
 *   locales no se conservan: los remotos los genera Postgres.
 */

/* -------------------------------------------------------------------------- */
/* Inspeccion                                                                 */
/* -------------------------------------------------------------------------- */

export interface LocalDataSummary {
  tasks: number;
  activities: number;
  financeEntries: number;
  /** Suma de lo anterior. Cero significa que no hay nada que subir. */
  total: number;
}

export async function summarizeLocalData(): Promise<LocalDataSummary> {
  const [tasks, activities, financeEntries] = await Promise.all([
    sqliteRepositories.tasks.list(),
    sqliteRepositories.activities.list(),
    sqliteRepositories.finance.list(),
  ]);

  return {
    tasks: tasks.length,
    activities: activities.length,
    financeEntries: financeEntries.length,
    total: tasks.length + activities.length + financeEntries.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Importacion                                                                */
/* -------------------------------------------------------------------------- */

export interface ImportReport {
  categories: number;
  activities: number;
  activityEvents: number;
  payments: number;
  tasks: number;
  financeEntries: number;
  reminders: number;
  /** Filas que no se pudieron trasladar. Se informan, no se ocultan. */
  skipped: number;
}

const EMPTY_REPORT: ImportReport = {
  categories: 0,
  activities: 0,
  activityEvents: 0,
  payments: 0,
  tasks: 0,
  financeEntries: 0,
  reminders: 0,
  skipped: 0,
};

/**
 * Clave con la que se reconoce la misma categoria del sistema en los dos
 * lados. No se puede usar el ID: en local son cadenas fijas ('cat-ex-gym') y
 * en Postgres son UUID por usuario.
 */
function systemKey(category: Category): string {
  return `${category.domain ?? 'task'}::${category.name.toLowerCase()}`;
}

/**
 * Sube a la cuenta una copia de los datos locales.
 *
 * Devuelve el recuento de lo trasladado. No lanza por una fila suelta que
 * falle: la cuenta como omitida y sigue, porque abortar a la mitad dejaria un
 * estado peor que uno incompleto y conocido.
 *
 * INVARIANTE que hace segura la opcion de reintentar: lo unico que puede
 * hacer que esta funcion LANCE es la primera lectura remota, que ocurre antes
 * de escribir nada. Todas las escrituras van dentro de su propio try. Por eso
 * llegar al estado de error significa siempre «no se subio nada», y volver a
 * intentarlo no puede duplicar.
 *
 * Si algun dia se agrega una escritura fuera de un try, esa garantia se rompe
 * y el boton de reintentar pasa a poder duplicar datos.
 */
export async function importLocalData(): Promise<ImportReport> {
  const report: ImportReport = { ...EMPTY_REPORT };

  /* --- Categorias ------------------------------------------------------- */

  // Las del sistema ya existen en la cuenta: las siembra el trigger de alta.
  // Se emparejan por nombre y dominio en vez de duplicarlas, que es lo que
  // pasaria si se subieran tal cual.
  const [localCategories, remoteCategories] = await Promise.all([
    sqliteRepositories.categories.list(),
    repositories.categories.list(),
  ]);

  const remoteByKey = new Map(
    remoteCategories.map((category) => [systemKey(category), category.id]),
  );

  const categoryIds = new Map<ID, ID>();

  for (const local of localCategories) {
    const existing = remoteByKey.get(systemKey(local));
    if (existing) {
      categoryIds.set(local.id, existing);
      continue;
    }

    try {
      const created = await repositories.categories.create({
        name: local.name,
        domain: local.domain,
        color: local.color,
        icon: local.icon,
        // Una categoria que el usuario creo no es del sistema en la cuenta,
        // aunque lo fuera en una version anterior de la app.
        isSystem: false,
      });
      categoryIds.set(local.id, created.id);
      remoteByKey.set(systemKey(created), created.id);
      report.categories += 1;
    } catch (error) {
      console.error('[Launchpad] No se pudo subir la categoría:', local.name, error);
      report.skipped += 1;
    }
  }

  /* --- Actividades ------------------------------------------------------ */

  const localActivities = await sqliteRepositories.activities.list();
  const activityIds = new Map<ID, ID>();

  for (const local of localActivities) {
    try {
      const created = await repositories.activities.create({
        domain: local.domain,
        name: local.name,
        subtitle: local.subtitle,
        categoryId: local.categoryId ? (categoryIds.get(local.categoryId) ?? null) : null,
        // La clave de la imagen se conserva, pero el archivo sigue SOLO en
        // este telefono: Storage no forma parte de esta etapa. Al reinstalar
        // volveran las actividades sin su foto.
        imageKey: local.imageKey,
        location: local.location,
        sportKey: local.sportKey,
        status: local.status,
        weekdays: local.weekdays,
        startTime: local.startTime,
        endTime: local.endTime,
        startDate: local.startDate,
        endDate: local.endDate,
        notes: local.notes,
        billingCycle: local.billingCycle,
        billingAmount: local.billingAmount,
        currency: local.currency,
        lastPaymentDate: local.lastPaymentDate,
        nextPaymentDate: local.nextPaymentDate,
      });

      activityIds.set(local.id, created.id);
      report.activities += 1;
    } catch (error) {
      console.error('[Launchpad] No se pudo subir la actividad:', local.name, error);
      report.skipped += 1;
    }
  }

  /* --- Pagos y calendario ----------------------------------------------- */

  for (const local of localActivities) {
    const remoteId = activityIds.get(local.id);
    if (!remoteId) continue;

    try {
      const payments = await sqliteRepositories.payments.listByActivity(local.id);
      for (const payment of payments) {
        await repositories.payments.create({
          activityId: remoteId,
          amount: payment.amount,
          currency: payment.currency,
          paidAt: payment.paidAt,
          coversUntil: payment.coversUntil,
          notes: payment.notes,
        });
        report.payments += 1;
      }

      const events = await sqliteRepositories.activityEvents.listByActivity(local.id);
      if (events.length > 0) {
        await repositories.activityEvents.createMany(
          events.map((event) => ({
            activityId: remoteId,
            date: event.date,
            kind: event.kind,
            title: event.title,
            notes: event.notes,
            completed: event.completed,
            isGenerated: event.isGenerated,
          })),
        );
        report.activityEvents += events.length;
      }
    } catch (error) {
      console.error('[Launchpad] No se pudo subir el historial de:', local.name, error);
      report.skipped += 1;
    }
  }

  /* --- Tareas ------------------------------------------------------------ */

  const localTasks = await sqliteRepositories.tasks.list();
  const taskIds = new Map<ID, ID>();

  for (const local of localTasks) {
    try {
      const created = await repositories.tasks.create({
        title: local.title,
        description: local.description,
        status: local.status,
        priority: local.priority,
        dueDate: local.dueDate,
        dueTime: local.dueTime,
        categoryId: local.categoryId ? (categoryIds.get(local.categoryId) ?? null) : null,
        activityId: local.activityId ? (activityIds.get(local.activityId) ?? null) : null,
        completedAt: local.completedAt,
      });

      taskIds.set(local.id, created.id);
      report.tasks += 1;
    } catch (error) {
      console.error('[Launchpad] No se pudo subir la tarea:', local.title, error);
      report.skipped += 1;
    }
  }

  /* --- Alcancia ---------------------------------------------------------- */

  const localFinance = await sqliteRepositories.finance.list();

  for (const local of localFinance) {
    try {
      await repositories.finance.create({
        kind: local.kind,
        name: local.name,
        amount: local.amount,
        currency: local.currency,
        targetAmount: local.targetAmount,
        settledAmount: local.settledAmount,
        dueDay: local.dueDay,
        lastSettledMonth: local.lastSettledMonth,
        notes: local.notes,
        isActive: local.isActive,
      });
      report.financeEntries += 1;
    } catch (error) {
      console.error('[Launchpad] No se pudo subir el movimiento:', local.name, error);
      report.skipped += 1;
    }
  }

  /* --- Recordatorios ----------------------------------------------------- */

  // `notificationId` SI se conserva: la notificacion sigue programada en este
  // mismo telefono, asi que el handle continua siendo valido y cancelarla mas
  // tarde seguira funcionando. En cualquier otro dispositivo no significaria
  // nada, pero a otro dispositivo no llega esta importacion.
  const localReminders = await sqliteRepositories.reminders.list();

  for (const local of localReminders) {
    const targetId =
      local.targetId === null
        ? null
        : local.targetType === 'task'
          ? (taskIds.get(local.targetId) ?? null)
          : local.targetType === 'activity' || local.targetType === 'payment'
            ? (activityIds.get(local.targetId) ?? null)
            : null;

    // Un recordatorio cuyo destino no se pudo trasladar avisaria de algo que
    // ya no existe. Se omite en vez de subir un aviso roto.
    if (local.targetId !== null && targetId === null) {
      report.skipped += 1;
      continue;
    }

    try {
      await repositories.reminders.create({
        targetType: local.targetType,
        targetId,
        title: local.title,
        body: local.body,
        scheduledAt: local.scheduledAt,
        repeat: local.repeat,
        notificationId: local.notificationId,
        status: local.status,
      });
      report.reminders += 1;
    } catch (error) {
      console.error('[Launchpad] No se pudo subir el recordatorio:', local.title, error);
      report.skipped += 1;
    }
  }

  return report;
}
