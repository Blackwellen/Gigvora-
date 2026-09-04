import { useEffect } from 'react';
import { router } from 'expo-router';

// This route only exists so expo-router has a file to back the "Menu" tab
// bar item. The tab's `listeners.tabPress` (see ../_layout.tsx) intercepts
// the press and opens the /(app)/menu modal instead of navigating here — this
// component is a safety net for the rare case that fires anyway (e.g. a deep
// link straight to this route), bouncing back to the feed and opening the
// modal on top of it.
export default function MenuTabFallback() {
  useEffect(() => {
    router.replace('/(app)/(tabs)/live-feed');
    router.push('/(app)/menu');
  }, []);
  return null;
}
