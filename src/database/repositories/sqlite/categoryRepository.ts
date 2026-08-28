import type { ActivityDomain, Category, CreateInput, ID } from '@/types';
import { nowISO } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { createId } from '@/utils/id';

import { getDatabase } from '../../database';
import { asEnum, boolToInt, intToBool, type SqlValue } from '../../sql';
import type { CategoryRepository } from '../types';

interface CategoryRow {
  id: string;
  name: string;
  domain: string | null;
  color: string;
  icon: string | null;
  is_system: number;
  created_at: string;
  updated_at: string;
}

const DOMAINS: readonly ActivityDomain[] = ['exercise', 'academic', 'hobby'];

function toDomain(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain === null ? null : asEnum(row.domain, DOMAINS, 'hobby'),
    color: row.color,
    icon: row.icon,
    isSystem: intToBool(row.is_system),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const sqliteCategoryRepository: CategoryRepository = {
  /**
   * `list()` sin argumento devuelve todas las categorías.
   * `list(null)` devuelve las de tareas (las que no pertenecen a un dominio).
   */
  async list(domain?: ActivityDomain | null): Promise<Category[]> {
    const db = await getDatabase();

    let where = '';
    const values: SqlValue[] = [];

    if (domain === null) {
      where = 'WHERE domain IS NULL';
    } else if (domain !== undefined) {
      where = 'WHERE domain = ?';
      values.push(domain);
    }

    const rows = await db.getAllAsync<CategoryRow>(
      `SELECT * FROM categories ${where} ORDER BY is_system DESC, name COLLATE NOCASE ASC`,
      values,
    );

    return rows.map(toDomain);
  },

  async findById(id: ID): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CategoryRow>(
      'SELECT * FROM categories WHERE id = ?',
      [id],
    );
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<Category>): Promise<Category> {
    const db = await getDatabase();
    const timestamp = nowISO();
    const category: Category = {
      ...input,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.runAsync(
      `INSERT INTO categories (id, name, domain, color, icon, is_system, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category.id,
        category.name,
        category.domain,
        category.color,
        category.icon,
        boolToInt(category.isSystem),
        category.createdAt,
        category.updatedAt,
      ],
    );

    return category;
  },

  async remove(id: ID): Promise<void> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'DELETE FROM categories WHERE id = ? AND is_system = 0',
      [id],
    );
    if (result.changes === 0) {
      throw new AppError('Las categorías del sistema no se pueden eliminar.', 'category_protected');
    }
  },
};
