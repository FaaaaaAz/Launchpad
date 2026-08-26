import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useSettings } from '@/providers/SettingsProvider';
import type { FinanceEntry, ID } from '@/types';
import { toUserMessage } from '@/utils/errors';

import * as financeService from './financeService';
import type { FinanceDraft } from './financeService';
import { summarizeFinance, type FinanceSummary } from './financeSelectors';

interface FinanceContextValue {
  entries: FinanceEntry[];
  summary: FinanceSummary;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getById: (id: ID) => FinanceEntry | undefined;
  createEntry: (draft: FinanceDraft) => Promise<FinanceEntry>;
  updateEntry: (id: ID, draft: FinanceDraft) => Promise<FinanceEntry>;
  deleteEntry: (id: ID) => Promise<void>;
  /** Alterna el marcado del mes en curso. */
  toggleMonth: (entry: FinanceEntry) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

/**
 * Estado compartido de la alcancía.
 *
 * La moneda se toma de las preferencias, así que los movimientos se guardan
 * siempre con la que el usuario tiene configurada.
 */
export function FinanceProvider({ children }: { children: ReactNode }) {
  const { currency } = useSettings();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setEntries(await financeService.listEntries());
    } catch (cause) {
      setError(toUserMessage(cause, 'No se pudieron cargar tus finanzas.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => summarizeFinance(entries), [entries]);

  const value = useMemo<FinanceContextValue>(
    () => ({
      entries,
      summary,
      isLoading,
      error,
      refresh,

      getById: (id) => entries.find((entry) => entry.id === id),

      createEntry: async (draft) => {
        const created = await financeService.createEntry(draft, currency);
        await refresh();
        return created;
      },

      updateEntry: async (id, draft) => {
        const updated = await financeService.updateEntry(id, draft, currency);
        await refresh();
        return updated;
      },

      deleteEntry: async (id) => {
        await financeService.deleteEntry(id);
        await refresh();
      },

      toggleMonth: async (entry) => {
        if (financeService.isSettledThisMonth(entry)) {
          await financeService.unsettleMonth(entry);
        } else {
          await financeService.settleMonth(entry);
        }
        await refresh();
      },
    }),
    [entries, summary, isLoading, error, refresh, currency],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceContextValue {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance debe usarse dentro de <FinanceProvider>.');
  }
  return context;
}
