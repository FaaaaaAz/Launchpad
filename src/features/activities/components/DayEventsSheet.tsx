import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/form';
import { BottomSheet, Button, Text } from '@/components/ui';
import { getSportConfig } from '@/constants';
import type { SportKey } from '@/constants';
import { colors, radius, spacing, HIT_SLOP } from '@/theme';
import type { ActivityEvent, ActivityEventKind, DateOnly } from '@/types';
import { formatDateLong, today } from '@/utils/date';

export interface DayEventsSheetProps {
  /** Día abierto. `null` cierra la hoja. */
  date: DateOnly | null;
  events: ActivityEvent[];
  sport: SportKey;
  onClose: () => void;
  onAdd: (kind: ActivityEventKind, title: string) => void;
  onRemove: (event: ActivityEvent) => void;
  onToggleCompleted: (event: ActivityEvent) => void;
}

/**
 * Hoja para anotar un día del calendario.
 *
 * Deja añadir un entrenamiento o una competencia, marcarlos como cumplidos y
 * borrarlos. El vocabulario lo pone el deporte: en fútbol dirá «Partido» y en
 * natación «Competencia».
 */
export function DayEventsSheet({
  date,
  events,
  sport,
  onClose,
  onAdd,
  onRemove,
  onToggleCompleted,
}: DayEventsSheetProps) {
  const config = getSportConfig(sport);
  const [title, setTitle] = useState('');

  // Al abrir otro día, el detalle escrito para el anterior ya no aplica.
  useEffect(() => {
    setTitle('');
  }, [date]);

  // Un día que todavía no llega no se puede dar por cumplido.
  const isFuture = date !== null && date > today();

  const add = (kind: ActivityEventKind) => {
    onAdd(kind, title);
    setTitle('');
  };

  return (
    <BottomSheet visible={date !== null} onClose={onClose}>
      <View style={styles.header}>
        <Text variant="title">{date ? formatDateLong(date) : ''}</Text>
        <Text variant="caption" tone="muted">
          {events.length === 0
            ? 'Sin nada anotado todavía'
            : isFuture
              ? 'Podrás marcarlo como cumplido cuando llegue el día'
              : `${events.length} ${events.length === 1 ? 'anotación' : 'anotaciones'}`}
        </Text>
      </View>

      {events.length > 0 ? (
        <View style={styles.list}>
          {events.map((event) => (
            <View key={event.id} style={styles.row}>
              <Pressable
                onPress={() => onToggleCompleted(event)}
                disabled={isFuture}
                hitSlop={HIT_SLOP}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: event.completed, disabled: isFuture }}
                accessibilityLabel={
                  isFuture
                    ? 'Todavía no se puede marcar: el día no ha llegado'
                    : event.completed
                      ? 'Marcar como pendiente'
                      : 'Marcar como cumplido'
                }
                style={[
                  styles.check,
                  event.completed
                    ? { backgroundColor: colors.success, borderColor: colors.success }
                    : { borderColor: colors.borderStrong },
                  isFuture && styles.checkDisabled,
                ]}
              >
                {event.completed ? (
                  <Ionicons name="checkmark" size={13} color={colors.background} />
                ) : isFuture ? (
                  <Ionicons name="time-outline" size={13} color={colors.textDisabled} />
                ) : null}
              </Pressable>

              <View style={styles.rowBody}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {event.kind === 'match' ? config.matchLabel : 'Entrenamiento'}
                </Text>
                {event.title ? (
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {event.title}
                  </Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => onRemove(event)}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Quitar del calendario"
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <TextField
        label="Detalle"
        value={title}
        onChangeText={setTitle}
        placeholder={config.hasMatches ? 'vs. Rojos, serie de fuerza…' : 'Pecho y tríceps…'}
        maxLength={60}
        hint="Opcional. Se muestra junto a la anotación."
      />

      <View style={styles.actions}>
        <Button
          label="Entrenamiento"
          onPress={() => add('training')}
          icon="barbell-outline"
          fullWidth
        />

        {config.hasMatches ? (
          <Button
            label={config.matchLabel}
            onPress={() => add('match')}
            variant="secondary"
            icon="trophy-outline"
            fullWidth
          />
        ) : null}

        <Button label="Cerrar" onPress={onClose} variant="ghost" fullWidth />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 2,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDisabled: {
    opacity: 0.5,
  },
  rowBody: {
    flex: 1,
    gap: 1,
  },
  actions: {
    gap: spacing.sm,
  },
});
