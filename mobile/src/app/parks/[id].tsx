import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatStates } from '@/components/ParkCard';
import { PointsBadge } from '@/components/PointsBadge';
import { getSampleParkById, pointsFor, SITE_CLASS_LABEL } from '@/data/sampleParks';
import { colors, radius, spacing } from '@/theme';

export default function ParkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const park = getSampleParkById(Number(id));

  if (!park) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Text style={styles.sectionTitle}>Park not found</Text>
        <Text style={styles.muted}>There is no park with id {id}.</Text>
      </View>
    );
  }

  const points = pointsFor(park);
  // Check-in, logging and scoring are later sprint tasks; buttons are placeholders.
  const comingSoon = (what: string) => Alert.alert(what, 'Coming in a later sprint.');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: park.name.replace(/ National (Park|Monument)$/, '') }} />

      <View style={[styles.hero, { backgroundColor: park.imageColor ?? colors.primary }]}>
        <Text style={styles.heroLetter}>{park.name.charAt(0)}</Text>
        <Text style={styles.heroNote}>Photo from NPS API (later)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>{park.name}</Text>
        <Text style={styles.muted}>
          {park.designation ?? 'Park'} · {formatStates(park.location)}
        </Text>
        <View style={styles.row}>
          <PointsBadge points={points} large />
          {park.siteClass && <Text style={styles.muted}>{SITE_CLASS_LABEL[park.siteClass]} · per verified visit</Text>}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }]}
        onPress={() => comingSoon('Check in')}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>Check in at this park</Text>
      </Pressable>

      {park.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.body}>{park.description}</Text>
        </View>
      ) : null}

      {park.activities?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activities</Text>
          <View style={styles.chips}>
            {park.activities.map((a) => (
              <View key={a} style={styles.chip}>
                <Text style={styles.chipText}>{a}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {park.wildlife?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wildlife you might spot</Text>
          <View style={styles.chips}>
            {park.wildlife.map((w) => (
              <View key={w} style={styles.chip}>
                <Text style={styles.chipText}>{w}</Text>
              </View>
            ))}
          </View>
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
  heroNote: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.chip, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
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
