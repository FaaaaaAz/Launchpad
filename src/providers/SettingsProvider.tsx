import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_CURRENCY, SETTING_KEYS } from '@/constants';
import { repositories } from '@/database';

interface SettingsContextValue {
  isLoading: boolean;

  /**
   * UUID del usuario que ya vio el saludo animado de PAD, o cadena vacía si
   * está pendiente. Se persiste en vez de guardarse en memoria para que cerrar
   * la app a mitad de la animación no se salte la bienvenida para siempre.
   */
  welcomeSeenFor: string;
  markWelcomeSeen: (userId: string) => Promise<void>;
  /** Vuelve a armar el saludo de PAD. Lo usa Configuración. */
  replayWelcome: () => Promise<void>;

  /** UUID del usuario al que ya se le subieron los datos locales, o ''. */
  localImportDoneFor: string;
  markLocalImportDone: (value: string) => Promise<void>;

  /*
   * El nombre del usuario NO está aquí, y es deliberado.
   *
   * Estuvo: se guardaba una copia local para que el dashboard pudiera saludar
   * sin esperar a la red. Costó un fallo real —el saludo mostró el nombre de
   * las pruebas anteriores a que existieran las cuentas, porque la copia
   * sobrevivía al registro y solo se refrescaba si el perfil cargaba bien—.
   *
   * La única fuente del nombre es `profiles.display_name`, vía
   * `useAuth().profile`. Mientras carga se saluda sin nombre, que es correcto;
   * enseñar el nombre equivocado no lo es.
   */

  currency: string;
  setCurrency: (value: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Preferencias del dispositivo.
 *
 * Se cargan de una vez al arrancar y se mantienen en memoria: son cuatro
 * valores y consultarlos en cada render sería trabajo inútil.
 *
 * Todo lo que guarda pertenece a este teléfono, no a la cuenta. Es la razón de
 * que siga apoyándose en SQLite mientras el resto de la app se mudó a
 * Supabase: subir «si ya viste la animación de PAD» obligaría a decidir qué
 * pasa cuando dos dispositivos no coinciden, y no hay nada que ganar con esa
 * respuesta.
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

      welcomeSeenFor: values[SETTING_KEYS.welcomeSeenFor] ?? '',
      markWelcomeSeen: (userId: string) => write(SETTING_KEYS.welcomeSeenFor, userId),
      replayWelcome: () => write(SETTING_KEYS.welcomeSeenFor, ''),

      localImportDoneFor: values[SETTING_KEYS.localImportDoneFor] ?? '',
      markLocalImportDone: (value: string) => write(SETTING_KEYS.localImportDoneFor, value),

      currency: values[SETTING_KEYS.currency] ?? DEFAULT_CURRENCY,
      setCurrency: (currency: string) => write(SETTING_KEYS.currency, currency),
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
