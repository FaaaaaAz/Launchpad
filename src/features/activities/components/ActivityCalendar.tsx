import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { colors, radius, spacing, HIT_SLOP } from '@/theme';
import type { ActivityEvent, DateOnly } from '@/types';
import {
  buildMonthGrid,
  formatMonthLabel,
  monthOf,
  parseDateOnly,
  shiftMonth,
  today,
} from '@/utils/date';

export interface ActivityCalendarProps {
  /** Mes visible, en formato 'YYYY-MM'. */
  month: string;
  onChangeMonth: (month: string) => void;
  /** Eventos indexados por fecha. */
  byDate: Map<DateOnly, ActivityEvent[]>;
  onSelectDay: (date: DateOnly) => void;
  /** Color con que se pintan las competencias. */
  matchColor: string;
}

const WEEKDAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Calendario mensual de una actividad.
 *
 * Cada día muestra un punto por tipo de evento: entrenamiento en el color de
 * la app, competencia en el color del deporte. Los días cumplidos se rellenan;
 * los pendientes quedan en contorno. De un vistazo se ve la constancia del mes.
 */
export function ActivityCalendar({
  month,
  onChangeMonth,
  byDate,
  onSelectDay,
  matchColor,
}: ActivityCalendarProps) {
  const cells = buildMonthGrid(month);
  const currentMonthKey = monthOf(today());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel="Mes anterior"
          onPress={() => onChangeMonth(shiftMonth(month, -1))}
          size={32}
        />

        <Pressable
          onPress={() => onChangeMonth(currentMonthKey)}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`${formatMonthLabel(month)}. Toca para volver al mes actual.`}
        >
          <Text variant="bodyStrong" style={styles.monthLabel}>
            {formatMonthLabel(month)}
          </Text>
        </Pressable>

        <IconButton
          icon="chevron-forward"
          accessibilityLabel="Mes siguiente"
          onPress={() => onChangeMonth(shiftMonth(month, 1))}
          size={32}
        />
      </View>

      <View style={styles.weekHeader}>
        {WEEKDAY_HEADERS.map((initial, index) => (
          <View key={`${initial}-${index}`} style={styles.cell}>
            <Text variant="micro" tone="disabled">
              {initial}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }

          const events = byDate.get(date) ?? [];
          const isToday = date === today();
          const hasMatch = events.some((event) => event.kind === 'match');
          const hasTraining = events.some((event) => event.kind === 'training');
          const allDone = events.length > 0 && events.every((event) => event.completed);

          const dayNumber = parseDateOnly(date)?.getDate() ?? 0;

          return (
            <Pressable
              key={date}
              onPress={() => onSelectDay(date)}
              accessibilityRole="button"
              accessibilityLabel={buildDayLabel(dayNumber, hasTraining, hasMatch)}
              style={styles.cell}
            >
              <View
                style={[
                  styles.day,
                  isToday && styles.dayToday,
                  events.length > 0 && {
                    backgroundColor: allDone
                      ? `${hasMatch ? matchColor : colors.accent}33`
                      : colors.surfaceElevated,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  tone={events.length > 0 || isToday ? 'primary' : 'muted'}
                >
                  {dayNumber}
                </Text>
              </View>

              <View style={styles.dots}>
                {hasTraining ? (
                  <View
                    style={[
                      styles.dot,
                      { borderColor: colors.accent },
                      allDone && { backgroundColor: colors.accent },
                    ]}
                  />
                ) : null}
                {hasMatch ? (
                  <View
                    style={[
                      styles.dot,
                      { borderColor: matchColor },
                      allDone && { backgroundColor: matchColor },
                    ]}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendItem color={colors.accent} label="Entrenamiento" />
        <LegendItem color={matchColor} label="Competencia" />
        <View style={styles.legendItem}>
          <Ionicons name="ellipse" size={8} color={colors.textDisabled} />
          <Text variant="micro" tone="disabled">
            Relleno = cumplido
          </Text>
        </View>
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { borderColor: color }]} />
      <Text variant="micro" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function buildDayLabel(day: number, hasTraining: boolean, hasMatch: boolean): string {
  if (hasTraining && hasMatch) return `Día ${day}: entrenamiento y competencia`;
  if (hasMatch) return `Día ${day}: competencia`;
  if (hasTraining) return `Día ${day}: entrenamiento`;
  return `Día ${day}: sin anotaciones`;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  monthLabel: {
    textTransform: 'capitalize',
  },
  weekHeader: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: spacing.xs,
    gap: 3,
  },
  day: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
