import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_CURRENCY, SETTING_KEYS } from '@/constants';
import { repositories } from '@/database';

interface SettingsContextValue {
  isLoading: boolean;
  /** Si ya pasó por la pantalla de bienvenida. */
  onboardingCompleted: boolean;
  userName: string;
  currency: string;
  completeOnboarding: (userName: string) => Promise<void>;
  setUserName: (value: string) => Promise<void>;
  setCurrency: (value: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Preferencias locales.
 *
 * Se cargan de una vez al arrancar y se mantienen en memoria: son cuatro
 * valores y consultarlos en cada render sería trabajo inútil.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const stored = await repositories.settings.getAll();
        if (active) setValues(stored);
      } catch (error) {
        console.error('[Launchpad] No se pudieron leer las preferencias:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const write = useCallback(async (key: string, value: string) => {
    await repositories.settings.set(key, value);
    setValues((previous) => ({ ...previous, [key]: value }));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      isLoading,
      onboardingCompleted: values[SETTING_KEYS.onboardingCompleted] === 'true',
      userName: values[SETTING_KEYS.userName] ?? '',
      currency: values[SETTING_KEYS.currency] ?? DEFAULT_CURRENCY,

      completeOnboarding: async (userName: string) => {
        const trimmed = userName.trim();
        if (trimmed) await write(SETTING_KEYS.userName, trimmed);
        await write(SETTING_KEYS.onboardingCompleted, 'true');
      },

      setUserName: (name: string) => write(SETTING_KEYS.userName, name.trim()),
      setCurrency: (currency: string) => write(SETTING_KEYS.currency, currency),
      resetOnboarding: () => write(SETTING_KEYS.onboardingCompleted, 'false'),
    }),
    [isLoading, values, write],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings debe usarse dentro de <SettingsProvider>.');
  }
  return context;
}
