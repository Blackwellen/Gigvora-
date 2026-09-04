import AsyncStorage from '@react-native-async-storage/async-storage';

// Non-sensitive, device-local "has this person seen the intro slides"
// flag — deliberately AsyncStorage rather than SecureStore, since it holds
// no credentials and doesn't need encryption at rest.
const ONBOARDED_KEY = 'gigvora-onboarded';

export async function getHasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setHasOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    // Best-effort — worst case the user sees the intro slides again next launch.
  }
}
