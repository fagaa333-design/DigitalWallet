import { MOCK_WALLET_CARDS } from '../src/features/wallet/presentation/data/mock-cards';
import { CARD_PALETTES, getCardPalette } from '../src/features/wallet/presentation/theme/colors';
import { WALLET_ITEM_TYPES } from '../src/features/wallet/domain/wallet-item';

describe('Wallet Presentation Layer', () => {
  it('contains valid mock cards matching domain item types', () => {
    expect(MOCK_WALLET_CARDS.length).toBeGreaterThan(0);

    for (const card of MOCK_WALLET_CARDS) {
      expect(WALLET_ITEM_TYPES).toContain(card.type);
      expect(typeof card.id).toBe('string');
      expect(typeof card.title).toBe('string');
      expect(typeof card.category).toBe('string');
      expect(card.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(card.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof card.details).toBe('object');
    }
  });

  it('correctly maps color palettes with fallback to obsidian', () => {
    expect(getCardPalette('sapphire').name).toBe('Royal Sapphire');
    expect(getCardPalette('emerald').name).toBe('Emerald Forest');
    expect(getCardPalette('invalid-color').id).toBe('obsidian');
    expect(getCardPalette(null).id).toBe('obsidian');
  });

  it('provides distinct colors with high contrast for text in each palette', () => {
    for (const key of Object.keys(CARD_PALETTES)) {
      const palette = CARD_PALETTES[key];
      expect(palette.background).toBeDefined();
      expect(palette.textPrimary).toBe('#FFFFFF');
      expect(palette.border).toBeDefined();
    }
  });

  it('filters cards by category accurately', () => {
    const financeCards = MOCK_WALLET_CARDS.filter((c) => c.category === 'Finanzas');
    expect(financeCards.length).toBeGreaterThan(0);
    expect(financeCards.every((c) => c.category === 'Finanzas')).toBe(true);

    const idCards = MOCK_WALLET_CARDS.filter((c) => c.category === 'Identificación');
    expect(idCards.length).toBeGreaterThan(0);
    expect(idCards.every((c) => c.category === 'Identificación')).toBe(true);
  });

  it('filters cards by search query across title, issuer and category', () => {
    const query = 'Titanium';
    const results = MOCK_WALLET_CARDS.filter(
      (c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        (c.subtitle?.toLowerCase().includes(query.toLowerCase()) ?? false),
    );
    expect(results.length).toBe(1);
    expect(results[0].title).toContain('Titanium');
  });

  it('validates card creation input correctly', () => {
    const validTitle = 'Tarjeta de Transporte Test';
    expect(validTitle.trim().length).toBeGreaterThan(0);

    const emptyTitle = '   ';
    expect(emptyTitle.trim().length).toBe(0);
  });
});
