import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_CURRENCY, SETTING_KEYS } from '@/constants';
import { repositories } from '@/database';

interface SettingsContextValue {
  isLoading: boolean;
  /** Si ya pasó por la pantalla de bienvenida. */
  onboardingCompleted: boolean;
  /**
   * Si queda por mostrar la bienvenida de la mascota.
   * Se persiste en vez de guardarse en memoria para que cerrar la app a
   * mitad de la animación no se salte la bienvenida para siempre.
   */
  welcomePending: boolean;
  userName: string;
  currency: string;
  completeOnboarding: (userName: string) => Promise<void>;
  dismissWelcome: () => Promise<void>;
  /** Vuelve a armar la bienvenida sin repetir el onboarding. */
  replayWelcome: () => Promise<void>;
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
      welcomePending: values[SETTING_KEYS.welcomePending] === 'true',
      userName: values[SETTING_KEYS.userName] ?? '',
      currency: values[SETTING_KEYS.currency] ?? DEFAULT_CURRENCY,

      completeOnboarding: async (userName: string) => {
        const trimmed = userName.trim();
        if (trimmed) await write(SETTING_KEYS.userName, trimmed);
        // La bienvenida se marca ANTES de dar por completado el onboarding:
        // así, cuando el router cambie a la app, la mascota ya está armada y
        // no se pierde el primer fotograma de su animación.
        await write(SETTING_KEYS.welcomePending, 'true');
        await write(SETTING_KEYS.onboardingCompleted, 'true');
      },

      dismissWelcome: () => write(SETTING_KEYS.welcomePending, 'false'),
      replayWelcome: () => write(SETTING_KEYS.welcomePending, 'true'),

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
