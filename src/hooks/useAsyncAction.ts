import { useCallback, useRef, useState } from 'react';

import { ValidationError, toUserMessage } from '@/utils/errors';

interface AsyncActionState<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  isRunning: boolean;
  /** Error general, listo para mostrar. */
  error: string | null;
  /** Errores por campo cuando la acción lanzó un ValidationError. */
  fieldErrors: Record<string, string>;
  clearErrors: () => void;
}

/**
 * Envuelve una operación asíncrona con estado de carga y de error.
 *
 * Existe para que ningún formulario tenga que repetir el mismo
 * try/catch/setLoading, y para que los errores de validación acaben siempre
 * junto al campo que los provocó en lugar de en una alerta genérica.
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): AsyncActionState<TArgs, TResult> {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Evita disparar la acción dos veces si el usuario toca el botón rápido.
  const inFlight = useRef(false);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (inFlight.current) return undefined;

      inFlight.current = true;
      setIsRunning(true);
      setError(null);
      setFieldErrors({});

      try {
        return await action(...args);
      } catch (cause) {
        if (cause instanceof ValidationError) {
          setFieldErrors(cause.fieldErrors);
        } else {
          setError(toUserMessage(cause));
        }
        return undefined;
      } finally {
        inFlight.current = false;
        setIsRunning(false);
      }
    },
    [action],
  );

  const clearErrors = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  return { run, isRunning, error, fieldErrors, clearErrors };
}
