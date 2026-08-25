import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { DOMAIN_CONFIG } from '@/constants';
import { colors, spacing, typography } from '@/theme';

/**
 * Barra de pestañas.
 *
 * Cinco destinos: el máximo que se lee cómodamente en un iPhone sin que las
 * etiquetas se corten. Configuración vive fuera, en el engranaje del
 * dashboard, porque es la sección que menos se abre.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="exercise"
        options={{
          title: DOMAIN_CONFIG.exercise.title,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={DOMAIN_CONFIG.exercise.icon} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="academic"
        options={{
          title: DOMAIN_CONFIG.academic.title,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={DOMAIN_CONFIG.academic.icon} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="hobbies"
        options={{
          title: DOMAIN_CONFIG.hobby.title,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={DOMAIN_CONFIG.hobby.icon} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tareas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    // En Android la barra necesita algo más de alto para respirar.
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: spacing.sm,
  },
  label: {
    fontSize: typography.micro.fontSize,
    fontWeight: typography.micro.fontWeight,
  },
  item: {
    paddingVertical: spacing.xs,
  },
});
