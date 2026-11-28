import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { fetchMyScore, fetchMyVisits, type Score, type Visit } from '@/api/visits';
import { useAuth, type AuthFetch } from '@/auth/AuthContext';
import { LoadState } from '@/components/LoadState';
import { colors, radius, spacing } from '@/theme';
import { formatDate, formatPoints } from '@/utils/format';

type Data = { score: Score; visits: Visit[] };

async function loadData(authFetch: AuthFetch): Promise<Data> {
  const [score, visits] = await Promise.all([fetchMyScore(authFetch), fetchMyVisits(authFetch)]);
  return { score, visits };
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : 'Could not load your score.';
}

// GET /me/score and GET /me/visits (docs/api.md, Visits).
export default function ScoreScreen() {
  const { status, user, authFetch, signOut } = useAuth();
  const signedIn = status === 'signedIn';
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Reload each time the screen comes into view, so a new check-in shows up.
  useFocusEffect(
    useCallback(() => {
      if (!signedIn) return;
      let active = true;
      loadData(authFetch).then(
        (d) => {
          if (!active) return;
          setData(d);
          setError(null);
        },
        (e: unknown) => {
          if (active) setError(messageOf(e));
        },
      );
      return () => {
        active = false;
      };
    }, [signedIn, authFetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setData(await loadData(authFetch));
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setRefreshing(false);
    }
  };

  if (status === 'signedOut') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sign in to see your score</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/login')} accessibilityRole="button">
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    const retry = () => {
      setError(null);
      loadData(authFetch).then(setData, (e: unknown) => setError(messageOf(e)));
    };
    return <LoadState error={error} loadingText="Loading your score…" onRetry={retry} />;
  }

  const { score, visits } = data;
  const breakdown = score.breakdown;

  return (
    <FlatList
      data={visits}
      keyExtractor={(v) => String(v.id)}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.totalCard} accessible accessibilityLabel={`Total score ${score.total_points} points`}>
            <Text style={styles.totalNumber}>{score.total_points}</Text>
            <Text style={styles.totalLabel}>total points</Text>
            <Text style={styles.totalSub}>
              {score.visit_count} {score.visit_count === 1 ? 'check-in' : 'check-ins'}
            </Text>
          </View>

          {breakdown ? (
            <View style={styles.breakdown}>
              <Stat label="Parks" value={breakdown.parks} />
              <Stat label="Hikes" value={breakdown.hikes} />
              <Stat label="Activities" value={breakdown.activities} />
              <Stat label="Wildlife" value={breakdown.wildlife} />
            </View>
          ) : null}

          {error ? <Text style={styles.error}>Could not refresh: {error}</Text> : null}
          <Text style={styles.sectionTitle}>Visit history</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.visit, pressed && { opacity: 0.7 }]}
          onPress={() => router.push({ pathname: '/parks/[id]', params: { id: String(item.park_id) } })}
          accessibilityRole="link"
          accessibilityLabel={`${item.park_name}, ${formatDate(item.visited_date)}, ${formatPoints(item.points_awarded)}`}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.visitName} numberOfLines={2}>
              {item.park_name}
            </Text>
            <Text style={styles.muted}>{formatDate(item.visited_date)}</Text>
          </View>
          <Text style={item.points_awarded > 0 ? styles.points : styles.zero}>
            {item.points_awarded > 0 ? `+${formatPoints(item.points_awarded)}` : '0 pts'}
          </Text>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.muted}>No check-ins yet. Pick a park and check in to start earning points.</Text>
          <Pressable onPress={() => router.navigate('/')} accessibilityRole="link">
            <Text style={styles.link}>Browse parks</Text>
          </Pressable>
        </View>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          <Text style={styles.muted}>Signed in as {user?.username}</Text>
          <Pressable style={styles.secondaryButton} onPress={signOut} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>
      }
    />
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  header: { gap: spacing.lg, marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  totalCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' },
  totalNumber: { fontSize: 48, fontWeight: '800', color: colors.primaryText },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.primaryText },
  totalSub: { fontSize: 13, color: colors.primaryText, opacity: 0.85, marginTop: spacing.xs },
  breakdown: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  visit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  visitName: { fontSize: 15, fontWeight: '700', color: colors.text },
  points: {
    backgroundColor: colors.accent,
    color: colors.text,
    fontWeight: '700',
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  zero: { color: colors.textMuted, fontWeight: '600' },
  muted: { fontSize: 14, color: colors.textMuted },
  error: { fontSize: 13, color: colors.danger },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  link: { color: colors.primary, fontWeight: '700' },
  footer: { marginTop: spacing.xl, gap: spacing.md },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
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
});
