import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import type { YardCandidate } from '../api/yard.api';

export type YardRecommendationCardProps = {
  candidate: YardCandidate;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function YardRecommendationCard({
  candidate,
  selected,
  disabled,
  onPress,
}: YardRecommendationCardProps) {
  const { theme } = useTheme();
  const topReasons = candidate.reasons.slice(0, 2);
  const score = Math.round(candidate.ruleScore);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: 8,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.colors.primary : theme.colors.borderDark,
        backgroundColor: selected ? theme.colors.infoBackground : theme.colors.surface,
        padding: 12,
        gap: 6,
        marginBottom: 8,
        minHeight: 48,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: selected ? theme.colors.primary : theme.colors.textPrimary,
            flex: 1,
          }}
        >
          {selected ? '✓ ' : ''}{candidate.slotCode}
        </Text>
        <View
          style={{
            backgroundColor: score >= 80 ? theme.colors.successBackground : theme.colors.surfaceSubtle,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: score >= 80 ? theme.colors.success : theme.colors.textSecondary,
            }}
          >
            ★{score}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
        Khu {candidate.blockCode}
      </Text>
      {topReasons.map((reason, i) => (
        <Text key={i} style={{ fontSize: 12, color: theme.colors.textMuted }}>
          · {reason.replace(/hard rules/gi, 'quy tắc xếp bãi')}
        </Text>
      ))}
      {candidate.warnings.map((warning, i) => (
        <Text
          key={i}
          style={{ fontSize: 12, color: theme.colors.warning, fontWeight: '600' }}
        >
          ⚠ {warning}
        </Text>
      ))}
    </TouchableOpacity>
  );
}
