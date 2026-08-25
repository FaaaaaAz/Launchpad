import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { colors } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /**
   * Bordes seguros a respetar. Las pantallas con tabs no necesitan 'bottom'
   * porque la barra ya ocupa esa zona.
   */
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
}

/** Contenedor raíz de una pantalla: fondo de la app y área segura. */
export function Screen({ children, edges = ['top'], style }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
