import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { designationOf, fetchParks } from '@/api/parks';
import { LoadState } from '@/components/LoadState';
import { ParkCard } from '@/components/ParkCard';
import { colors, radius, spacing } from '@/theme';
import type { Designation, Park } from '@/types/park';

type Filter = 'All' | Designation;
const FILTERS: Filter[] = ['All', 'National Park', 'National Monument'];

export default function ParkCatalogScreen() {
  const [parks, setParks] = useState<Park[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  // Bumped by "Try again" and pull to refresh to load the list again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchParks()
      .then((list) => {
        if (!active) return;
        setParks(list);
        setError(null);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load parks.');
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setAttempt((n) => n + 1);
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (parks ?? []).filter((p) => {
      if (filter !== 'All' && designationOf(p) !== filter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.location ?? '').toLowerCase().includes(q);
    });
  }, [parks, query, filter]);

  if (!parks) {
    const retry = () => {
      setError(null);
      setAttempt((n) => n + 1);
    };
    return <LoadState error={error} loadingText="Loading parks…" onRetry={retry} />;
  }

  return (
    <FlatList
      data={shown}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => <ParkCard park={item} />}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
          {error ? <Text style={styles.error}>Could not refresh: {error}</Text> : null}
          <Text style={styles.count}>
            {shown.length} {shown.length === 1 ? 'site' : 'sites'}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {parks.length === 0 ? 'No parks have been loaded yet.' : `No parks match “${query}”.`}
        </Text>
      }
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
  error: { fontSize: 13, color: colors.danger },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
