import { Stack } from 'expo-router';

// Wraps the 5-tab shell with a modal route for the "full menu" (opened from
// the far-left tab bar item) so it slides up over the tabs instead of
// replacing them.
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="menu" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
