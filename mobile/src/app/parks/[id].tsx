import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api/client';
import { bannerColor, designationOf, fetchPark, formatStates, getCachedPark, pointsFor, shortName } from '@/api/parks';
import { CheckInCard } from '@/components/CheckInCard';
import { LoadState } from '@/components/LoadState';
import { PointsBadge } from '@/components/PointsBadge';
import { colors, radius, spacing } from '@/theme';
import type { Park } from '@/types/park';

export default function ParkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const parkId = Number(id);
  // Opened from the catalogue: use the park we already have. Opened by link: fetch it.
  const [park, setPark] = useState<Park | null>(() => getCachedPark(parkId) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [attempt, setAttempt] = useState(0); // bumped by "Try again"

  useEffect(() => {
    if (getCachedPark(parkId)) return;
    let active = true;
    fetchPark(parkId)
      .then((p) => {
        if (active) setPark(p);
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) setNotFound(true);
        else setError(e instanceof Error ? e.message : 'Could not load this park.');
      });
    return () => {
      active = false;
    };
  }, [parkId, attempt]);

  if (notFound) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Text style={styles.sectionTitle}>Park not found</Text>
        <Text style={styles.muted}>There is no park with id {id}.</Text>
      </View>
    );
  }

  if (!park) {
    const retry = () => {
      setError(null);
      setAttempt((n) => n + 1);
    };
    return <LoadState error={error} loadingText="Loading park…" onRetry={retry} />;
  }

  const points = pointsFor(park);
  // Logging activities and sightings comes in the next PR; these buttons are placeholders.
  const comingSoon = (what: string) => Alert.alert(what, 'Coming soon.');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: shortName(park) }} />

      {park.image_url ? (
        <Image source={{ uri: park.image_url }} style={styles.hero} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.hero, { backgroundColor: bannerColor(park) }]}>
          <Text style={styles.heroLetter}>{park.name.charAt(0)}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.title}>{park.name}</Text>
        <Text style={styles.muted}>
          {designationOf(park) ?? 'Park'} · {formatStates(park.location)}
        </Text>
        <View style={styles.row}>
          {points === null ? (
            <Text style={styles.muted}>Point value coming soon</Text>
          ) : (
            <>
              <PointsBadge points={points} large />
              <Text style={styles.muted}>per eligible check-in</Text>
            </>
          )}
        </View>
      </View>

      <CheckInCard parkId={park.id} parkPoints={points} />

      {park.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.body}>{park.description}</Text>
        </View>
      ) : null}

      <View style={styles.secondaryRow}>
        <Pressable style={styles.secondaryButton} onPress={() => comingSoon('Log activity')} accessibilityRole="button">
          <Text style={styles.secondaryButtonText}>Log activity</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => comingSoon('Add sighting')} accessibilityRole="button">
          <Text style={styles.secondaryButtonText}>Add sighting</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  hero: { height: 180, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  heroLetter: { color: '#fff', fontSize: 72, fontWeight: '800' },
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  secondaryRow: { flexDirection: 'row', gap: spacing.md },
  secondaryButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '700' },
});
