import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { CardPresentationItem } from '../../types/presentation-types';
import { useWalletTheme } from '../../theme';
import { DigitalWalletCard } from './DigitalWalletCard';

interface FeaturedCardHeroProps {
  cards: CardPresentationItem[];
  onSelectCard: (card: CardPresentationItem) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

export const FeaturedCardHero: React.FC<FeaturedCardHeroProps> = ({
  cards,
  onSelectCard,
}) => {
  const { colors, typography, spacing } = useWalletTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  if (cards.length === 0) {
    return null;
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + spacing.md));
    if (index >= 0 && index < cards.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      {/* Hero Section Header */}
      <View style={styles.headerRow}>
        <Text style={[typography.headline, { color: colors.textPrimary }]}>
          Bóveda Principal
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {activeIndex + 1} de {cards.length}
        </Text>
      </View>

      {/* Horizontal Carousel */}
      <ScrollView
        horizontal
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + spacing.md}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingRight: spacing.lg },
        ]}
      >
        {cards.map((card, index) => (
          <View
            key={card.id}
            style={[
              styles.cardWrapper,
              {
                width: CARD_WIDTH,
                marginRight: index < cards.length - 1 ? spacing.md : 0,
              },
            ]}
          >
            <DigitalWalletCard
              card={card}
              size="standard"
              onPress={onSelectCard}
            />
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      {cards.length > 1 && (
        <View style={styles.dotsRow}>
          {cards.map((card, index) => {
            const isActive = index === activeIndex;
            return (
              <View
                key={card.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive
                      ? colors.accent
                      : colors.border,
                    width: isActive ? 20 : 6,
                  },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingLeft: 16,
  },
  cardWrapper: {
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});

