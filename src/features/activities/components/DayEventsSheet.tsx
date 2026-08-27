import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/form';
import { Button, Text } from '@/components/ui';
import { getSportConfig } from '@/constants';
import type { SportKey } from '@/constants';
import { colors, radius, spacing, HIT_SLOP } from '@/theme';
import type { ActivityEvent, ActivityEventKind, DateOnly } from '@/types';
import { formatDateLong } from '@/utils/date';

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

  const add = (kind: ActivityEventKind) => {
    onAdd(kind, title);
    setTitle('');
  };

  return (
    <Modal visible={date !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text variant="title">{date ? formatDateLong(date) : ''}</Text>
            <Text variant="caption" tone="muted">
              {events.length === 0
                ? 'Sin nada anotado todavía'
                : `${events.length} ${events.length === 1 ? 'anotación' : 'anotaciones'}`}
            </Text>
          </View>

          {events.length > 0 ? (
            <View style={styles.list}>
              {events.map((event) => (
                <View key={event.id} style={styles.row}>
                  <Pressable
                    onPress={() => onToggleCompleted(event)}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: event.completed }}
                    accessibilityLabel={
                      event.completed ? 'Marcar como pendiente' : 'Marcar como cumplido'
                    }
                    style={[
                      styles.check,
                      event.completed
                        ? { backgroundColor: colors.success, borderColor: colors.success }
                        : { borderColor: colors.borderStrong },
                    ]}
                  >
                    {event.completed ? (
                      <Ionicons name="checkmark" size={13} color={colors.background} />
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
            placeholder={
              config.hasMatches ? 'vs. Rojos, serie de fuerza…' : 'Pecho y tríceps…'
            }
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
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
  rowBody: {
    flex: 1,
    gap: 1,
  },
  actions: {
    gap: spacing.sm,
  },
});
