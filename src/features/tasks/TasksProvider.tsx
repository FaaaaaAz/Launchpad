import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { ID, Task } from '@/types';
import { toUserMessage } from '@/utils/errors';

import * as taskService from './taskService';
import type { TaskDraft, TaskMutationResult } from './taskService';

interface TasksContextValue {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTask: (draft: TaskDraft) => Promise<TaskMutationResult>;
  updateTask: (id: ID, draft: TaskDraft) => Promise<TaskMutationResult>;
  toggleTask: (task: Task) => Promise<void>;
  deleteTask: (id: ID) => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

/**
 * Estado compartido de tareas.
 *
 * El dashboard y la pantalla de tareas leen la misma lista, así que vive en un
 * contexto y no en cada pantalla: completar una tarea desde el inicio se
 * refleja de inmediato en el resto de la app.
 *
 * Tras cada mutación se relee la lista completa. Con este volumen de datos es
 * instantáneo y evita toda una categoría de errores de sincronización entre
 * el estado local y la base.
 */
export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setTasks(await taskService.listTasks());
    } catch (cause) {
      setError(toUserMessage(cause, 'No se pudieron cargar las tareas.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<TasksContextValue>(
    () => ({
      tasks,
      isLoading,
      error,
      refresh,

      createTask: async (draft) => {
        const result = await taskService.createTask(draft);
        await refresh();
        return result;
      },

      updateTask: async (id, draft) => {
        const result = await taskService.updateTask(id, draft);
        await refresh();
        return result;
      },

      toggleTask: async (task) => {
        // Actualización optimista: marcar una tarea debe sentirse inmediato.
        setTasks((previous) =>
          previous.map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  status: item.status === 'completed' ? 'pending' : 'completed',
                }
              : item,
          ),
        );

        try {
          await taskService.toggleTaskCompletion(task);
        } finally {
          await refresh();
        }
      },

      deleteTask: async (id) => {
        await taskService.deleteTask(id);
        await refresh();
      },
    }),
    [tasks, isLoading, error, refresh],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks debe usarse dentro de <TasksProvider>.');
  }
  return context;
}
