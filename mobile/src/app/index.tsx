import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ParkCard } from '@/components/ParkCard';
import { SAMPLE_PARKS } from '@/data/sampleParks';
import { colors, radius, spacing } from '@/theme';
import type { Designation } from '@/types/park';

type Filter = 'All' | Designation;
const FILTERS: Filter[] = ['All', 'National Park', 'National Monument'];

export default function ParkCatalogScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const parks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SAMPLE_PARKS.filter((p) => {
      if (filter !== 'All' && p.designation !== filter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.location ?? '').toLowerCase().includes(q);
    });
  }, [query, filter]);

  return (
    <FlatList
      data={parks}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => <ParkCard park={item} />}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.subtitle}>Pick a park, check in, and start earning points.</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or state (e.g. UT)"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel="Search parks"
          />
          <View style={styles.chips}>
            {FILTERS.map((f) => {
              const active = f === filter;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {f === 'All' ? 'All' : f + 's'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.count}>
            {parks.length} {parks.length === 1 ? 'site' : 'sites'} · sample data
          </Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No parks match “{query}”.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  header: { gap: spacing.md, marginBottom: spacing.md },
  subtitle: { fontSize: 15, color: colors.textMuted },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.chip,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: colors.primaryText },
  count: { fontSize: 13, color: colors.textMuted },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
