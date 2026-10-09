import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWalletTheme } from './theme';
import {
  HeaderBar,
  SearchBar,
  CategoryFilterPills,
  EmptyWalletState,
  AddCardButton,
} from './components/common';
import {
  DigitalWalletCard,
  FeaturedCardHero,
} from './components/cards';
import {
  SettingsPreviewModal,
} from './components/modals';
import {
  CardPresentationItem,
  CategoryFilterKey,
} from './types/presentation-types';
import { useWallet } from './context/wallet-context';
import { UiIcon } from './components/icons';

interface WalletHomeScreenProps {
  initialCards?: CardPresentationItem[];
}

export const WalletHomeScreen: React.FC<WalletHomeScreenProps> = ({
  initialCards,
}) => {
  const { colors, typography, spacing, isDark, borderRadius } = useWalletTheme();
  const {
    cards: contextCards,
    loading,
    error,
    clearError,
  } = useWallet();

  // If initialCards is provided (e.g. in standalone tests), use it; otherwise use context cards
  const cards = initialCards ?? contextCards;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilterKey>('all');
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  // Filter & Search Logic
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Category match
      const matchesCategory =
        selectedCategory === 'all' || card.category === selectedCategory;

      if (!matchesCategory) {
        return false;
      }

      // Search query match
      if (!searchQuery.trim()) {
        return true;
      }

      const query = searchQuery.toLowerCase().trim();
      const titleMatch = card.title.toLowerCase().includes(query);
      const subtitleMatch =
        card.subtitle?.toLowerCase().includes(query) ?? false;
      const categoryMatch = card.category.toLowerCase().includes(query);
      const numberMatch =
        card.maskedNumber?.toLowerCase().includes(query) ?? false;
      const descriptionMatch =
        card.description?.toLowerCase().includes(query) ?? false;

      return (
        titleMatch ||
        subtitleMatch ||
        categoryMatch ||
        numberMatch ||
        descriptionMatch
      );
    });
  }, [cards, selectedCategory, searchQuery]);

  // Compute category count map for pills
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: cards.length };
    cards.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [cards]);

  // Navigation Handlers
  const handleSelectCard = (card: CardPresentationItem) => {
    try {
      router.push({ pathname: '/card/[id]', params: { id: card.id } });
    } catch {
      // In non-router test contexts, no-op gracefully
    }
  };

  const handleAddCard = () => {
    try {
      router.push('/card/new');
    } catch {
      // In non-router test contexts, no-op gracefully
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const isFilteredOrSearching =
    searchQuery.trim().length > 0 || selectedCategory !== 'all';

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Top Header */}
      <HeaderBar
        title="Digital Wallet"
        greeting="Bóveda Local Protegida"
        onPressSettings={() => setIsSettingsVisible(true)}
      />

      {/* Error notification banner if any */}
      {error && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: colors.danger,
              borderRadius: borderRadius.md,
              marginHorizontal: spacing.lg,
            },
          ]}
        >
          <UiIcon name="alert" size={16} color={colors.danger} />
          <Text style={[typography.caption, { color: colors.danger, flex: 1 }]}>
            {error}
          </Text>
          <TouchableOpacity onPress={clearError}>
            <UiIcon name="close" size={12} color={colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.huge + 60 },
        ]}
      >
        {/* Search Field */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* Category Filter Pills */}
        <CategoryFilterPills
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categoryCounts={categoryCounts}
        />

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}

        {/* Hero Featured Stack (displayed when not searching to give clean hero view) */}
        {!isFilteredOrSearching && cards.length > 0 && (
          <FeaturedCardHero
            cards={cards.slice(0, 4)}
            onSelectCard={handleSelectCard}
          />
        )}

        {/* Main Items Section */}
        <View style={[styles.sectionHeaderRow, { paddingHorizontal: spacing.lg }]}>
          <Text style={[typography.headline, { color: colors.textPrimary }]}>
            {isFilteredOrSearching
              ? `Resultados (${filteredCards.length})`
              : 'Todos los Documentos'}
          </Text>
          {isFilteredOrSearching && (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {filteredCards.length} encontrado{filteredCards.length === 1 ? '' : 's'}
            </Text>
          )}
        </View>

        {/* Cards List or Empty State */}
        {filteredCards.length > 0 ? (
          <View style={[styles.cardsList, { paddingHorizontal: spacing.lg }]}>
            {filteredCards.map((card) => (
              <DigitalWalletCard
                key={card.id}
                card={card}
                size="compact"
                onPress={handleSelectCard}
                style={styles.cardListItem}
              />
            ))}
          </View>
        ) : (
          <EmptyWalletState
            isSearching={isFilteredOrSearching}
            onResetSearch={handleResetFilters}
            onAddCard={handleAddCard}
          />
        )}
      </ScrollView>

      {/* Prominent Floating Add Card CTA */}
      <View
        style={[
          styles.floatingBarContainer,
          {
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.lg,
            backgroundColor: 'transparent',
          },
        ]}
      >
        <AddCardButton
          onPress={handleAddCard}
          label="Añadir tarjeta o documento"
        />
      </View>

      {/* Settings Diagnostic Modal */}
      <SettingsPreviewModal
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  loadingContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  cardsList: {
    gap: 14,
  },
  cardListItem: {
    marginBottom: 4,
  },
  floatingBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
