import { MOCK_WALLET_CARDS } from '../src/features/wallet/presentation/data/mock-cards';
import { CardPresentationItem } from '../src/features/wallet/presentation/types/presentation-types';

describe('Wallet Session State Logic', () => {
  let cards: CardPresentationItem[];

  beforeEach(() => {
    cards = [...MOCK_WALLET_CARDS];
  });

  it('initializes with default mock cards', () => {
    expect(cards.length).toBe(MOCK_WALLET_CARDS.length);
  });

  it('finds card by id correctly', () => {
    const target = cards[0];
    const found = cards.find((c) => c.id === target.id);
    expect(found).toBeDefined();
    expect(found?.title).toBe(target.title);
  });

  it('adds a new card to the beginning of the list', () => {
    const newCard: CardPresentationItem = {
      id: 'test-card-new-id',
      type: 'card',
      category: 'Finanzas',
      title: 'Nueva Tarjeta Virtual',
      subtitle: 'Banco de Prueba',
      description: 'Tarjeta añadida durante la prueba',
      imageId: null,
      color: 'sapphire',
      icon: 'card',
      badgeLabel: 'Finanzas',
      maskedNumber: '•••• 1122',
      issuer: 'Banco de Prueba',
      expiresText: '10/30',
      details: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cards = [newCard, ...cards];
    expect(cards.length).toBe(MOCK_WALLET_CARDS.length + 1);
    expect(cards[0].id).toBe('test-card-new-id');
  });

  it('deletes card by id correctly', () => {
    const targetId = cards[0].id;
    const initialCount = cards.length;

    cards = cards.filter((c) => c.id !== targetId);
    expect(cards.length).toBe(initialCount - 1);
    expect(cards.find((c) => c.id === targetId)).toBeUndefined();
  });
});

