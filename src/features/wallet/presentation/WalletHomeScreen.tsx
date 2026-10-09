import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  CardDetailModal,
  AddCardNoticeModal,
  SettingsPreviewModal,
} from './components/modals';
import { MOCK_WALLET_CARDS } from './data/mock-cards';
import {
  CardPresentationItem,
  CategoryFilterKey,
} from './types/presentation-types';

interface WalletHomeScreenProps {
  initialCards?: CardPresentationItem[];
}

export const WalletHomeScreen: React.FC<WalletHomeScreenProps> = ({
  initialCards = MOCK_WALLET_CARDS,
}) => {
  const { colors, typography, spacing, isDark } = useWalletTheme();

  // State management
  const [cards] = useState<CardPresentationItem[]>(initialCards);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilterKey>('all');
  const [selectedCard, setSelectedCard] =
    useState<CardPresentationItem | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isAddNoticeVisible, setIsAddNoticeVisible] = useState(false);
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

  // Handlers
  const handleSelectCard = (card: CardPresentationItem) => {
    setSelectedCard(card);
    setIsDetailModalVisible(true);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  // Recent/Grid cards: if searching or filtered, show all matches;
  // otherwise show cards that aren't in the hero or the full list
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
            onAddCard={() => setIsAddNoticeVisible(true)}
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
          onPress={() => setIsAddNoticeVisible(true)}
          label="Añadir tarjeta o documento"
        />
      </View>

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        visible={isDetailModalVisible}
        onClose={() => {
          setIsDetailModalVisible(false);
          setSelectedCard(null);
        }}
      />

      {/* Add Card Flow Notice Modal */}
      <AddCardNoticeModal
        visible={isAddNoticeVisible}
        onClose={() => setIsAddNoticeVisible(false)}
      />

      {/* Settings Preview Modal */}
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

