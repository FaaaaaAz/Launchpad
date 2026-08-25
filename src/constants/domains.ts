import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

import { domainColors } from '@/theme';
import type { ActivityDomain } from '@/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Todo lo que diferencia a Ejercicio, Académico y Hobbies vive aquí.
 *
 * Las tres pantallas comparten el mismo componente y solo cambian por esta
 * configuración: el textos, el ícono y el color de acento. Agregar un módulo
 * nuevo (ej. Finanzas, Salud) es agregar una entrada a este objeto y una ruta.
 */
export interface DomainConfig {
  key: ActivityDomain;
  /** Título del módulo. */
  title: string;
  /** Frase corta bajo el título. */
  tagline: string;
  icon: IconName;
  color: string;
  /** Cómo se llama una unidad en este módulo. Ej: 'actividad', 'materia'. */
  itemLabel: string;
  itemLabelPlural: string;
  /** Texto del botón de creación. */
  createLabel: string;
  namePlaceholder: string;
  subtitleLabel: string;
  subtitlePlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
}

export const DOMAIN_CONFIG: Record<ActivityDomain, DomainConfig> = {
  exercise: {
    key: 'exercise',
    title: 'Ejercicio',
    tagline: 'Tus actividades físicas y membresías',
    icon: 'barbell',
    color: domainColors.exercise,
    itemLabel: 'actividad',
    itemLabelPlural: 'actividades',
    createLabel: 'Nueva actividad',
    namePlaceholder: 'Smart Fit',
    subtitleLabel: 'Lugar o descripción',
    subtitlePlaceholder: 'Sucursal Norte',
    emptyTitle: 'Sin actividades todavía',
    emptyDescription:
      'Agrega tu gimnasio, tu academia de boxeo o cualquier entrenamiento para verlo aquí con sus días, horarios y pagos.',
  },
  academic: {
    key: 'academic',
    title: 'Académico',
    tagline: 'Universidad, materias y proyectos',
    icon: 'school',
    color: domainColors.academic,
    itemLabel: 'materia',
    itemLabelPlural: 'materias',
    createLabel: 'Nueva materia',
    namePlaceholder: 'Sistemas Distribuidos',
    subtitleLabel: 'Docente o descripción',
    subtitlePlaceholder: 'Ing. Pérez — Aula 302',
    emptyTitle: 'Sin materias todavía',
    emptyDescription:
      'Registra tus materias, cursos o proyectos para tener a mano sus horarios y fechas importantes.',
  },
  hobby: {
    key: 'hobby',
    title: 'Hobbies',
    tagline: 'Lo que haces porque quieres',
    icon: 'color-palette',
    color: domainColors.hobby,
    itemLabel: 'hobby',
    itemLabelPlural: 'hobbies',
    createLabel: 'Nuevo hobby',
    namePlaceholder: 'Fotografía',
    subtitleLabel: 'Descripción',
    subtitlePlaceholder: 'Salidas de fin de semana',
    emptyTitle: 'Sin hobbies todavía',
    emptyDescription:
      'Fotografía, lectura, música, videojuegos. Lo que te gusta también merece un espacio.',
  },
};

/** Orden en que aparecen los módulos en la navegación y el dashboard. */
export const DOMAIN_ORDER: ActivityDomain[] = ['exercise', 'academic', 'hobby'];

export function getDomainConfig(domain: ActivityDomain): DomainConfig {
  return DOMAIN_CONFIG[domain];
}
