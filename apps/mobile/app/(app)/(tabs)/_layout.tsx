import type { ReactNode } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Platform, Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { Tabs, router } from 'expo-router';
import { colors } from '../../../src/lib/theme';
import { useNotifications } from '../../../src/lib/useNotifications';
import { useConversations } from '../../../src/lib/useInbox';

type CenterFeedButtonProps = {
  children?: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  accessibilityState?: { selected?: boolean };
};

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={{ fontSize: 21, color }}>{symbol}</Text>;
}

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

/**
 * The primary action of the app (go watch/browse the live feed) gets a
 * raised, circular button that floats above the bar — the same visual
 * language TikTok/Instagram use for their center "create" action, repurposed
 * here for the feed since that's Gigvora's landing destination.
 */
function CenterFeedButton(props: CenterFeedButtonProps) {
  const { children, onPress, accessibilityState } = props;
  const focused = accessibilityState?.selected;
  return (
    <Pressable onPress={onPress} style={styles.centerWrap} accessibilityRole="button" accessibilityLabel="Live feed">
      <View style={[styles.centerButton, focused && styles.centerButtonFocused]}>{children}</View>
    </Pressable>
  );
}

export default function AppTabsLayout() {
  const { data: notifications } = useNotifications();
  const { data: conversations } = useConversations();

  const unreadNotifications = notifications?.filter((n) => !n.is_read).length ?? 0;
  const unreadMessages = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand600,
        tabBarInactiveTintColor: colors.ink400,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="menu"
        options={{ title: 'Menu', tabBarIcon: ({ color }) => <TabIcon symbol="☰" color={color} /> }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/(app)/menu');
          },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => (
            <View>
              <TabIcon symbol="\u{1F514}" color={color} />
              <TabBadge count={unreadNotifications} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="live-feed"
        options={{
          title: '',
          tabBarIcon: () => <Text style={styles.centerGlyph}>{'▶'}</Text>,
          tabBarButton: (props) => <CenterFeedButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => (
            <View>
              <TabIcon symbol="\u{1F4AC}" color={color} />
              <TabBadge count={unreadMessages} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabIcon symbol="\u{1F464}" color={color} /> }}
      />
    </Tabs>
  );
}

const BAR_HEIGHT = Platform.select({ ios: 84, default: 64 });

const styles = StyleSheet.create({
  tabBar: {
    borderTopColor: colors.ink100,
    height: BAR_HEIGHT,
    paddingTop: 8,
    paddingBottom: Platform.select({ ios: 28, default: 10 }),
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -22,
    backgroundColor: colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  centerButtonFocused: { backgroundColor: colors.brand700 },
  centerGlyph: { fontSize: 22, color: colors.white, marginLeft: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.red500,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
});
