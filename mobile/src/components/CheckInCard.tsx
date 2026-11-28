import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { checkIn, fetchParkStatus, type CheckIn, type ParkStatus } from '@/api/visits';
import { useAuth } from '@/auth/AuthContext';
import { colors, radius, spacing } from '@/theme';
import { formatDate, formatPoints } from '@/utils/format';

function messageOf(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

// Check-in button and the signed-in user's status at this park
// (POST /visits and GET /me/parks/:park_id in docs/api.md).
export function CheckInCard({ parkId, parkPoints }: { parkId: number; parkPoints: number | null }) {
  const { status, authFetch } = useAuth();
  const signedIn = status === 'signedIn';
  const [parkStatus, setParkStatus] = useState<ParkStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckIn | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the status whenever the screen comes into view, so it is fresh after signing in.
  useFocusEffect(
    useCallback(() => {
      if (!signedIn) return;
      let active = true;
      fetchParkStatus(authFetch, parkId).then(
        (s) => {
          if (!active) return;
          setParkStatus(s);
          setStatusError(null);
        },
        (e: unknown) => {
          if (active) setStatusError(messageOf(e, 'Could not load your visits here.'));
        },
      );
      return () => {
        active = false;
      };
    }, [signedIn, authFetch, parkId]),
  );

  if (!signedIn) {
    return (
      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        onPress={() => router.push('/login')}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>Sign in to check in</Text>
      </Pressable>
    );
  }

  const onCheckIn = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await checkIn(authFetch, parkId));
      // Refresh the status line; the check-in itself already succeeded.
      try {
        setParkStatus(await fetchParkStatus(authFetch, parkId));
      } catch {
        // Keep the old status.
      }
    } catch (e) {
      setError(messageOf(e, 'Check-in failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const earnsNow = parkStatus?.can_earn_points_now ?? true;

  return (
    <View style={styles.card}>
      <StatusLine parkStatus={parkStatus} statusError={statusError} parkPoints={parkPoints} />

      <Pressable
        style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed]}
        onPress={onCheckIn}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ busy }}
      >
        {busy ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={styles.primaryButtonText}>
            {parkStatus && parkStatus.visit_count > 0 ? 'Check in again' : 'Check in at this park'}
          </Text>
        )}
      </Pressable>
      {!earnsNow && !result ? (
        <Text style={styles.muted}>You can still check in, but it will score 0 park points.</Text>
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {result ? (
        <View style={styles.result} accessibilityLiveRegion="polite">
          <Text style={styles.resultTitle}>
            {result.points_awarded > 0 ? `Checked in! +${formatPoints(result.points_awarded)}` : 'Checked in'}
          </Text>
          <Text style={styles.body}>
            {result.points_awarded > 0
              ? `Visit on ${formatDate(result.visited_date)}.`
              : !parkPoints
                ? 'This park doesn’t have a point value yet, so this check-in scored 0.'
                : 'No park points this time, because you earned them here in the last 12 months.'}
            {result.next_eligible_date && parkPoints
              ? ` Next park points from ${formatDate(result.next_eligible_date)}.`
              : ''}
          </Text>
          <Pressable onPress={() => router.push('/score')} accessibilityRole="link">
            <Text style={styles.link}>See my score</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function StatusLine({
  parkStatus,
  statusError,
  parkPoints,
}: {
  parkStatus: ParkStatus | null;
  statusError: string | null;
  parkPoints: number | null;
}) {
  if (statusError) return <Text style={styles.muted}>{statusError}</Text>;
  if (!parkStatus) return <Text style={styles.muted}>Checking your visits…</Text>;

  if (parkStatus.visit_count === 0) {
    return (
      <Text style={styles.body}>
        You haven’t checked in here yet.
        {parkPoints ? ` Your first check-in earns ${formatPoints(parkPoints)}.` : ''}
      </Text>
    );
  }

  const times = parkStatus.visit_count === 1 ? 'once' : `${parkStatus.visit_count} times`;
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.body}>
        You’ve checked in here {times}, last on {formatDate(parkStatus.last_visited_date)}.
      </Text>
      <Text style={parkStatus.can_earn_points_now ? styles.good : styles.muted}>
        {parkStatus.can_earn_points_now || !parkStatus.next_eligible_date
          ? 'Your next check-in earns points.'
          : `Next park points from ${formatDate(parkStatus.next_eligible_date)}.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  body: { fontSize: 15, lineHeight: 21, color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  good: { fontSize: 14, fontWeight: '700', color: colors.primary },
  error: { fontSize: 14, color: colors.danger },
  result: { backgroundColor: colors.chip, borderRadius: radius.sm, padding: spacing.md, gap: spacing.xs },
  resultTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  link: { color: colors.primary, fontWeight: '700', marginTop: spacing.xs },
});
