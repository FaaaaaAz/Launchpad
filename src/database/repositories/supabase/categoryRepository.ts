import type { CategoryRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { ActivityDomain, Category, CreateInput, ID } from '@/types';
import { AppError } from '@/utils/errors';

import type { CategoryRepository } from '../types';
import { asEnum, toISO, unwrapMany, unwrapMaybe, unwrapOne } from './rows';

const DOMAINS: readonly ActivityDomain[] = ['exercise', 'academic', 'hobby'];

function toDomain(row: CategoryRow): Category {
  return {
    id: row.id,
    domain: row.domain === null ? null : asEnum(row.domain, DOMAINS, 'hobby'),
    name: row.name,
    color: row.color,
    icon: row.icon,
    isSystem: row.is_system,
    createdAt: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
  };
}

/** Las del sistema primero, luego por nombre. Equivale al COLLATE NOCASE. */
function byReadingOrder(a: Category, b: Category): number {
  if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;

  const left = a.name.toLowerCase();
  const right = b.name.toLowerCase();
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export const supabaseCategoryRepository: CategoryRepository = {
  /**
   * `list()` sin argumento devuelve todas.
   * `list(null)` devuelve las de tareas (las que no pertenecen a un dominio).
   *
   * Cada usuario tiene su propia copia de las categorias del sistema, sembrada
   * al crear la cuenta por el trigger `handle_new_user`. Por eso no hace falta
   * distinguir aqui entre categorias globales y propias: todas son propias.
   */
  async list(domain?: ActivityDomain | null): Promise<Category[]> {
    let query = supabase.from('categories').select('*');

    if (domain === null) query = query.is('domain', null);
    else if (domain !== undefined) query = query.eq('domain', domain);

    const rows = unwrapMany(await query, 'cargar las categorías');
    return rows.map(toDomain).sort(byReadingOrder);
  },

  async findById(id: ID): Promise<Category | null> {
    const row = unwrapMaybe(
      await supabase.from('categories').select('*').eq('id', id).maybeSingle(),
      'abrir la categoría',
    );
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<Category>): Promise<Category> {
    const row = unwrapOne(
      await supabase
        .from('categories')
        .insert({
          name: input.name,
          domain: input.domain,
          color: input.color,
          icon: input.icon,
          is_system: input.isSystem,
        })
        .select('*')
        .single(),
      'crear la categoría',
    );
    return toDomain(row);
  },

  async remove(id: ID): Promise<void> {
    // El filtro `is_system = false` va en el DELETE, no en una comprobacion
    // previa: asi la proteccion es la propia consulta y no puede colarse una
    // categoria del sistema por una carrera entre leer y borrar.
    const deleted = unwrapMany(
      await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('is_system', false)
        .select('id'),
      'eliminar la categoría',
    );

    if (deleted.length === 0) {
      throw new AppError(
        'Las categorías del sistema no se pueden eliminar.',
        'category_protected',
      );
    }
  },
};
