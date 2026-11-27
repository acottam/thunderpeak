import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type User = { id: number; username: string };
export type Session = { token: string; user: User };

const KEY = 'thunderpeak.session';

// Phones use the encrypted device store. expo-secure-store has no web version,
// so the browser keeps the session in localStorage and a page reload stays signed in.
// Tokens expire after 7 days, and the app checks the saved token with GET /me on start.
// If localStorage is unavailable (some private browsing modes), fall back to memory.
let memorySession: string | null = null;

function webStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

async function readRaw(): Promise<string | null> {
  if (Platform.OS !== 'web') return SecureStore.getItemAsync(KEY);
  try {
    return webStorage()?.getItem(KEY) ?? memorySession;
  } catch {
    return memorySession;
  }
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await readRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return parsed?.token && parsed.user ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  const raw = JSON.stringify(session);
  if (Platform.OS !== 'web') {
    await SecureStore.setItemAsync(KEY, raw);
    return;
  }
  memorySession = raw;
  try {
    webStorage()?.setItem(KEY, raw);
  } catch {
    // Storage full or blocked: the in-memory copy keeps this tab signed in.
  }
}

export async function clearSession(): Promise<void> {
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(KEY);
    return;
  }
  memorySession = null;
  try {
    webStorage()?.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}
