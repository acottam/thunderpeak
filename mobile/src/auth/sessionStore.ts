import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type User = { id: number; username: string };
export type Session = { token: string; user: User };

const KEY = 'thunderpeak.session';

// expo-secure-store has no web version. On web the session lives in memory only,
// so a page reload signs the person out. Phones use the encrypted device store.
let webSession: string | null = null;

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = Platform.OS === 'web' ? webSession : await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return parsed?.token && parsed.user ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  const raw = JSON.stringify(session);
  if (Platform.OS === 'web') webSession = raw;
  else await SecureStore.setItemAsync(KEY, raw);
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') webSession = null;
  else await SecureStore.deleteItemAsync(KEY);
}
