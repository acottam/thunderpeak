import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text } from 'react-native';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme';

function AccountButton() {
  const { status, user } = useAuth();
  if (status === 'loading') return null;
  const signedIn = status === 'signedIn' && user;
  return (
    <Pressable
      onPress={() => router.push(signedIn ? '/score' : '/login')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={signedIn ? `My score, signed in as ${user.username}` : 'Sign in'}
    >
      <Text style={{ color: colors.primaryText, fontWeight: '700' }}>{signedIn ? 'My score' : 'Sign in'}</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.primaryText,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Park Catalog', headerRight: () => <AccountButton /> }} />
        <Stack.Screen name="parks/[id]" options={{ title: 'Park' }} />
        <Stack.Screen name="score" options={{ title: 'My Score' }} />
        <Stack.Screen name="login"options={{ title: 'Sign in', presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
