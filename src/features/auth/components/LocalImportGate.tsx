import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { BootScreen } from '@/components/BootScreen';
import { Button } from '@/components/ui';
import { NO_LOCAL_IMPORT, mascot } from '@/constants';
import { useSettings } from '@/providers/SettingsProvider';
import { toUserMessage } from '@/utils/errors';

import { useAuth } from '../AuthProvider';
import { importLocalData, summarizeLocalData } from '../localImportService';
import type { ImportReport } from '../localImportService';
import { AuthFeedback } from './AuthFeedback';
import { AuthLayout } from './AuthLayout';

type Phase = 'checking' | 'importing' | 'done' | 'failed' | 'ready';

/**
 * Sube a la cuenta los datos que ya existían en este teléfono.
 *
 * Launchpad funcionó meses sin cuentas: puede haber tareas, actividades y una
 * alcancía entera en SQLite. Esta puerta se cruza una sola vez, la primera vez
 * que alguien inicia sesión en este dispositivo, y se aparta para siempre.
 *
 * Por qué es una pantalla y no algo silencioso en segundo plano: subir los
 * datos de alguien es una operación que merece verse. Si fallara a la mitad y
 * hubiese ocurrido en silencio, el usuario descubriría el problema días
 * después, sin saber qué pasó ni cuándo.
 *
 * Nada se borra del teléfono. Lo que se sube es una copia.
 */
export function LocalImportGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isLoading, localImportDoneFor, markLocalImportDone } = useSettings();

  const [phase, setPhase] = useState<Phase>('checking');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Evita que un re-render en mitad de la subida la lance por segunda vez y
  // acabe duplicando todo.
  const started = useRef(false);

  const run = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;

    setPhase('importing');
    setError(null);

    try {
      const result = await importLocalData();
      await markLocalImportDone(userId);
      setReport(result);
      setPhase('done');
    } catch (cause) {
      setError(toUserMessage(cause, 'No pudimos subir tus datos anteriores.'));
      setPhase('failed');
    }
  }, [user?.id, markLocalImportDone]);

  useEffect(() => {
    if (isLoading || started.current) return;

    // Ya se hizo (o se comprobó que no había nada). Es el camino normal a
    // partir del segundo arranque.
    if (localImportDoneFor) {
      setPhase('ready');
      return;
    }

    started.current = true;

    void (async () => {
      try {
        const summary = await summarizeLocalData();

        if (summary.total === 0) {
          // Nada que subir: se deja constancia para no volver a mirar en cada
          // arranque, y se sigue sin enseñar nada al usuario.
          await markLocalImportDone(NO_LOCAL_IMPORT);
          setPhase('ready');
          return;
        }

        await run();
      } catch (cause) {
        // Ni siquiera se pudo leer la base local. No es motivo para dejar al
        // usuario fuera de su cuenta: se sigue y se avisa en consola.
        console.error('[Launchpad] No se pudo revisar los datos locales:', cause);
        setPhase('ready');
      }
    })();
  }, [isLoading, localImportDoneFor, markLocalImportDone, run]);

  if (isLoading || phase === 'checking') return <BootScreen />;

  if (phase === 'importing') {
    return (
      <AuthLayout
        mascot={mascot.study}
        eyebrow="Un momento"
        title="Guardando tus datos"
        subtitle="Estamos subiendo a tu cuenta lo que ya tenías en este teléfono. No cierres la app."
        padLine="Esto solo pasa una vez. Después, todo viaja contigo."
      >
        <AuthFeedback loading="Subiendo tus datos…" />
      </AuthLayout>
    );
  }

  if (phase === 'failed') {
    return (
      <AuthLayout
        mascot={mascot.study}
        eyebrow="No pudimos terminar"
        title="Tus datos siguen aquí"
        subtitle="No se subió nada a la cuenta, pero nada se ha perdido: todo continúa guardado en este teléfono. Puedes reintentarlo ahora o más tarde."
        padLine="Tranquilo. No he borrado nada."
      >
        <AuthFeedback error={error} />

        <Button
          label="Reintentar"
          onPress={() => void run()}
          fullWidth
          size="large"
          icon="refresh"
        />

        <Button
          label="Continuar sin subirlos"
          onPress={() => setPhase('ready')}
          variant="secondary"
          fullWidth
          size="large"
        />
      </AuthLayout>
    );
  }

  if (phase === 'done' && report) {
    const moved =
      report.tasks + report.activities + report.financeEntries + report.payments;

    return (
      <AuthLayout
        mascot={mascot.dance}
        eyebrow="Listo"
        title="Todo está en tu cuenta"
        subtitle={
          `Subimos ${report.tasks} ${report.tasks === 1 ? 'tarea' : 'tareas'}, ` +
          `${report.activities} ${report.activities === 1 ? 'actividad' : 'actividades'} y ` +
          `${report.financeEntries} ${report.financeEntries === 1 ? 'movimiento' : 'movimientos'} de tu alcancía. ` +
          'A partir de ahora te siguen aunque cambies de teléfono.'
        }
        padLine="Ya no dependemos de este teléfono."
      >
        <AuthFeedback
          success={`${moved} ${moved === 1 ? 'elemento guardado' : 'elementos guardados'} en la nube.`}
        />

        {/*
          Lo que no se pudo subir se dice, no se esconde. Un recuento que no
          cuadra y nadie avisó es peor que un aviso incómodo, sobre todo
          porque el original sigue en el teléfono y se puede recuperar.
        */}
        {report.skipped > 0 ? (
          <AuthFeedback
            error={`${report.skipped} ${
              report.skipped === 1
                ? 'elemento no se pudo subir y sigue'
                : 'elementos no se pudieron subir y siguen'
            } guardado${report.skipped === 1 ? '' : 's'} en este teléfono.`}
          />
        ) : null}

        <Button
          label="Entrar a Launchpad"
          onPress={() => setPhase('ready')}
          fullWidth
          size="large"
          icon="rocket-outline"
        />
      </AuthLayout>
    );
  }

  return <>{children}</>;
}
