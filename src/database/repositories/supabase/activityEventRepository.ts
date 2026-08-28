import type { ActivityEventRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type {
  ActivityEvent,
  ActivityEventKind,
  CreateInput,
  DateOnly,
  ID,
  UpdateInput,
} from '@/types';
import { today } from '@/utils/date';
import { AppError } from '@/utils/errors';

import type { ActivityEventRepository } from '../types';
import {
  asEnum,
  defined,
  toISO,
  unwrapMany,
  unwrapMaybe,
  unwrapOne,
  unwrapVoid,
} from './rows';

const KINDS: readonly ActivityEventKind[] = ['training', 'match'];

function toDomain(row: ActivityEventRow): ActivityEvent {
  return {
    id: row.id,
    activityId: row.activity_id,
    date: row.date,
    kind: asEnum(row.kind, KINDS, 'training'),
    title: row.title,
    notes: row.notes,
    completed: row.completed,
    isGenerated: row.is_generated,
    createdAt: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
  };
}

/**
 * Fila completa para el INSERT.
 *
 * `user_id` no aparece: lo pone el DEFAULT `auth.uid()` y lo verifica la
 * policy. Va aparte de `toPatch` porque insertar exige TODAS las columnas
 * obligatorias y actualizar solo las que cambian.
 *
 * En Postgres `completed` e `is_generated` son boolean de verdad: no hay que
 * convertirlos a 0/1 como en SQLite.
 */
function toInsert(input: CreateInput<ActivityEvent>) {
  return {
    activity_id: input.activityId,
    date: input.date,
    kind: input.kind,
    title: input.title,
    notes: input.notes,
    completed: input.completed,
    is_generated: input.isGenerated,
  };
}

/** Columnas que cambian. Las ausentes se quedan como estaban. */
function toPatch(input: UpdateInput<ActivityEvent>) {
  return defined({
    activity_id: input.activityId,
    date: input.date,
    kind: input.kind,
    title: input.title,
    notes: input.notes,
    completed: input.completed,
    is_generated: input.isGenerated,
  });
}

export const supabaseActivityEventRepository: ActivityEventRepository = {
  async listByActivity(activityId: ID): Promise<ActivityEvent[]> {
    const rows = unwrapMany(
      await supabase
        .from('activity_events')
        .select('*')
        .eq('activity_id', activityId)
        .order('date', { ascending: true }),
      'cargar el calendario',
    );
    return rows.map(toDomain);
  },

  /**
   * Proximo evento de cada actividad, de hoy en adelante.
   *
   * En SQLite era una subconsulta correlacionada que devolvia exactamente una
   * fila por actividad. PostgREST no puede expresar «el minimo por grupo», asi
   * que se piden los eventos futuros ordenados por fecha y se toma el primero
   * de cada actividad.
   *
   * El conjunto esta acotado por diseno: la app solo rellena entrenamientos
   * durante un ciclo de cobro, de modo que «de hoy en adelante» son unas
   * decenas de filas, no un historial creciente. Si algun dia se generaran
   * calendarios indefinidos, esto pide una vista en Postgres con DISTINCT ON.
   */
  async listNextByActivity(): Promise<Map<ID, ActivityEvent>> {
    const rows = unwrapMany(
      await supabase
        .from('activity_events')
        .select('*')
        .gte('date', today())
        .order('date', { ascending: true }),
      'cargar los próximos días',
    );

    const result = new Map<ID, ActivityEvent>();
    for (const row of rows) {
      // Si un dia tiene varios eventos, se queda el primero que llega.
      if (!result.has(row.activity_id)) result.set(row.activity_id, toDomain(row));
    }
    return result;
  },

  /**
   * Inserta varios dias de una vez.
   *
   * PostgREST admite un array en el INSERT y lo ejecuta como una sola
   * sentencia dentro de una transaccion: un mes de entrenamientos es una
   * peticion, no doce.
   */
  async createMany(inputs: CreateInput<ActivityEvent>[]): Promise<void> {
    if (inputs.length === 0) return;

    unwrapVoid(
      await supabase.from('activity_events').insert(inputs.map(toInsert)),
      'anotar los días en el calendario',
    );
  },

  async removeGeneratedFrom(activityId: ID, from: DateOnly): Promise<void> {
    // Solo los generados: los partidos y los dias que anoto el usuario
    // sobreviven a un cambio de horario.
    unwrapVoid(
      await supabase
        .from('activity_events')
        .delete()
        .eq('activity_id', activityId)
        .eq('is_generated', true)
        .gte('date', from),
      'rehacer el calendario',
    );
  },

  async findById(id: ID): Promise<ActivityEvent | null> {
    const row = unwrapMaybe(
      await supabase.from('activity_events').select('*').eq('id', id).maybeSingle(),
      'abrir el día',
    );
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<ActivityEvent>): Promise<ActivityEvent> {
    const row = unwrapOne(
      await supabase.from('activity_events').insert(toInsert(input)).select('*').single(),
      'anotar el día',
    );
    return toDomain(row);
  },

  async update(id: ID, patch: UpdateInput<ActivityEvent>): Promise<ActivityEvent> {
    const row = unwrapMaybe(
      await supabase
        .from('activity_events')
        .update(toPatch(patch))
        .eq('id', id)
        .select('*')
        .maybeSingle(),
      'guardar el día',
    );

    if (!row) throw new AppError('Este día ya no está anotado.', 'event_not_found');
    return toDomain(row);
  },

  async remove(id: ID): Promise<void> {
    unwrapVoid(
      await supabase.from('activity_events').delete().eq('id', id),
      'borrar el día',
    );
  },
};
