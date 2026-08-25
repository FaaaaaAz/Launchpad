import { useEffect, useState } from 'react';

import { repositories } from '@/database';
import type { ActivityDomain, Category } from '@/types';

/**
 * Categorías disponibles para un dominio.
 * `null` devuelve las de tareas.
 */
export function useCategories(domain: ActivityDomain | null): {
  categories: Category[];
  isLoading: boolean;
} {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    void (async () => {
      try {
        const result = await repositories.categories.list(domain);
        if (active) setCategories(result);
      } catch (error) {
        console.error('[Launchpad] No se pudieron cargar las categorías:', error);
        if (active) setCategories([]);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [domain]);

  return { categories, isLoading };
}
