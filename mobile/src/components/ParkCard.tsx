import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PointsBadge } from '@/components/PointsBadge';
import { pointsFor } from '@/data/sampleParks';
import { colors, radius, spacing } from '@/theme';
import type { Park } from '@/types/park';

export function formatStates(location: string | null): string {
  return location ? location.split(',').map((s) => s.trim()).join(' · ') : 'Location unknown';
}

export function ParkCard({ park }: { park: Park }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/parks/[id]', params: { id: String(park.id) } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="link"
      accessibilityLabel={`Open ${park.name}`}
    >
      <View style={[styles.thumb, { backgroundColor: park.imageColor ?? colors.primary }]}>
        <Text style={styles.thumbLetter}>{park.name.charAt(0)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {park.name}
        </Text>
        <Text style={styles.meta}>
          {park.designation ?? 'Park'} · {formatStates(park.location)}
        </Text>
        <PointsBadge points={pointsFor(park)} />
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbLetter: { color: '#fff', fontSize: 28, fontWeight: '800' },
  body: { flex: 1, gap: spacing.xs },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  chevron: { fontSize: 28, color: colors.textMuted },
});
