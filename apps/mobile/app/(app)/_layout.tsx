import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '../../src/lib/theme';

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
}

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand600,
        tabBarInactiveTintColor: colors.ink400,
        tabBarStyle: { borderTopColor: colors.ink100 },
      }}
    >
      <Tabs.Screen
        name="live-feed"
        options={{ title: 'Feed', tabBarIcon: ({ color }) => <TabIcon symbol="☷" color={color} /> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Alerts', tabBarIcon: ({ color }) => <TabIcon symbol="\u{1F514}" color={color} /> }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{ title: 'Inbox', tabBarIcon: ({ color }) => <TabIcon symbol="\u{1F4AC}" color={color} /> }}
      />
      <Tabs.Screen
        name="chat/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabIcon symbol="\u{1F464}" color={color} /> }}
      />
    </Tabs>
  );
}
