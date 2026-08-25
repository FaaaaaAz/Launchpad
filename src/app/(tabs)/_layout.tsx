import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { BubbleTabBar } from '@/components/navigation/BubbleTabBar';
import { DOMAIN_CONFIG } from '@/constants';
import { colors } from '@/theme';

/**
 * Barra de pestañas.
 *
 * Cinco destinos: el máximo que se lee cómodamente en un iPhone sin que las
 * etiquetas se corten. Configuración vive fuera, en el engranaje del
 * dashboard, porque es la sección que menos se abre.
 *
 * El aspecto y la animación los define `BubbleTabBar`; aquí solo se declaran
 * las rutas y sus íconos.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BubbleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
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
