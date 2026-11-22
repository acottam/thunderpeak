import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export function PointsBadge({ points, large = false }: { points: number | null; large?: boolean }) {
  if (points === null) return null;
  return (
    <View style={[styles.badge, large && styles.large]} accessibilityLabel={`${points} points per visit`}>
      <Text style={[styles.text, large && styles.largeText]}>{points} pts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  large: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  text: { color: colors.text, fontWeight: '700', fontSize: 12 },
  largeText: { fontSize: 15 },
});
