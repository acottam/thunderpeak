import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { colors, radius, spacing } from '@/theme';

type Mode = 'signIn' | 'register';

// Same rules as the API (docs/api.md, POST /auth/register), checked here first for quick feedback.
const USERNAME_RULE = /^[A-Za-z0-9_]{3,30}$/;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function LoginScreen() {
  const { status, user, signIn, register, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'signedIn' && user) {
    return (
      <View style={styles.signedIn}>
        <Stack.Screen options={{ title: 'Account' }} />
        <Text style={styles.title}>Signed in as {user.username}</Text>
        <Pressable style={styles.secondaryButton} onPress={signOut} accessibilityRole="button">
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
        <Pressable onPress={close} accessibilityRole="button">
          <Text style={styles.link}>Back to parks</Text>
        </Pressable>
      </View>
    );
  }

  const isRegister = mode === 'register';

  const submit = async () => {
    const name = username.trim();
    if (!name || !password) {
      setError('Enter a username and password.');
      return;
    }
    if (isRegister && !USERNAME_RULE.test(name)) {
      setError('Username must be 3 to 30 characters: letters, digits and underscore.');
      return;
    }
    if (isRegister && (password.length < 8 || password.length > 128)) {
      setError('Password must be 8 to 128 characters.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await (isRegister ? register(name, password) : signIn(name, password));
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? 'signIn' : 'register');
    setError(null);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isRegister ? 'Create account' : 'Sign in' }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{isRegister ? 'Create your account' : 'Welcome back'}</Text>
        <Text style={styles.muted}>Sign in to check in at parks and keep your score.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            maxLength={30}
            returnKeyType="next"
            accessibilityLabel="Username"
          />
          {isRegister ? <Text style={styles.hint}>3 to 30 letters, digits or underscores.</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            textContentType={isRegister ? 'newPassword' : 'password'}
            maxLength={128}
            returnKeyType="go"
            onSubmitEditing={submit}
            accessibilityLabel="Password"
          />
          {isRegister ? <Text style={styles.hint}>At least 8 characters.</Text> : null}
        </View>

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.primaryButton, (pressed || busy) && { opacity: 0.8 }]}
          onPress={submit}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ busy }}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.primaryButtonText}>{isRegister ? 'Create account' : 'Sign in'}</Text>
          )}
        </Pressable>
        {busy ? <Text style={styles.hint}>The first request can take about a minute while the server wakes up.</Text> : null}

        <Pressable onPress={switchMode} accessibilityRole="button">
          <Text style={styles.link}>
            {isRegister ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  signedIn: { flex: 1, padding: spacing.lg, gap: spacing.lg, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  muted: { fontSize: 15, color: colors.textMuted },
  field: { gap: spacing.xs },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  hint: { fontSize: 13, color: colors.textMuted },
  error: { fontSize: 14, color: colors.danger },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '700' },
  link: { color: colors.primary, fontWeight: '700', textAlign: 'center' },
});
