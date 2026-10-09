import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  CATEGORY_OPTIONS,
  CategoryFilterKey,
} from '../../types/presentation-types';
import { useWalletTheme } from '../../theme';
import { UiIcon } from '../icons/UiIcon';

interface CategoryFilterPillsProps {
  selectedCategory: CategoryFilterKey;
  onSelectCategory: (category: CategoryFilterKey) => void;
  categoryCounts?: Record<string, number>;
}

export const CategoryFilterPills: React.FC<CategoryFilterPillsProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}) => {
  const { colors, typography, spacing, borderRadius } = useWalletTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.lg },
        ]}
      >
        {CATEGORY_OPTIONS.map((option) => {
          const isSelected = selectedCategory === option.key;
          const count = categoryCounts ? categoryCounts[option.key] : undefined;

          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => onSelectCategory(option.key)}
              activeOpacity={0.75}
              style={[
                styles.pill,
                {
                  borderRadius: borderRadius.full,
                  borderColor: isSelected ? colors.accent : colors.border,
                  backgroundColor: isSelected
                    ? colors.accent
                    : colors.surfaceSubtle,
                  marginRight: spacing.sm,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Filtro ${option.label}`}
            >
              <UiIcon
                name={option.iconName}
                size={14}
                color={isSelected ? colors.accentContrast : colors.textSecondary}
                style={styles.pillIcon}
              />

              <Text
                style={[
                  typography.caption,
                  styles.pillText,
                  {
                    color: isSelected
                      ? colors.accentContrast
                      : colors.textPrimary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {option.label}
              </Text>

              {count !== undefined && count > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255, 255, 255, 0.25)'
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      {
                        color: isSelected
                          ? colors.accentContrast
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  pillIcon: {
    marginRight: 6,
  },
  pillText: {
    letterSpacing: 0.1,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

