import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SessionProvider, useSession } from '../src/lib/SessionContext';
import { getHasOnboarded } from '../src/lib/onboarding';
import { colors } from '../src/lib/theme';

// Kept visible (the branded splash configured in app.json's expo-splash-screen
// plugin) until the session + onboarding checks below resolve, so the app
// never flashes an unstyled blank frame before deciding where to route.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <SessionProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isLoading, isAuthenticated } = useSession();
  const [hasOnboarded, setHasOnboardedState] = useState<boolean | null>(null);

  useEffect(() => {
    getHasOnboarded().then(setHasOnboardedState);
  }, []);

  const ready = !isLoading && hasOnboarded !== null;

  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    // Renders nothing visible (the native splash is still covering the
    // screen) until both the auth check and the onboarding flag resolve.
    return <View style={{ flex: 1, backgroundColor: colors.white }} onLayout={onLayout} />;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="(app)" />
        ) : hasOnboarded ? (
          <Stack.Screen name="(auth)" />
        ) : (
          <Stack.Screen name="onboarding" />
        )}
      </Stack>
    </View>
  );
}
