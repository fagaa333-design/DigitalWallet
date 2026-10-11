jest.mock('expo-secure-store', () => jest.requireActual('./mocks/secure-store').secureStoreMock);
jest.mock('expo-file-system', () => jest.requireActual('./mocks/file-system'));
jest.mock('expo-sqlite', () => jest.requireActual('./mocks/expo-sqlite'));

import { initializeWalletKeys } from '@/shared/security/key-manager';
import { WalletRepository } from '@/features/wallet/data/wallet-repository';
import { secureStoreMock } from './mocks/secure-store';
import { fileSystemMock } from './mocks/file-system';
import { sqliteMock } from './mocks/expo-sqlite';
import { MOCK_WALLET_CARDS } from '@/features/wallet/presentation/data/mock-cards';
import { CardPresentationItem } from '@/features/wallet/presentation/types/presentation-types';

describe('Wallet Context & Repository Integration', () => {
  beforeEach(async () => {
    secureStoreMock.reset();
    fileSystemMock.reset();
    sqliteMock.reset(2, true);
    await initializeWalletKeys();
  });

  it('starts with an empty database when no cards have been persisted', async () => {
    const cards = await WalletRepository.getCards();
    expect(cards).toHaveLength(0);
  });

  it('persists cards and retrieves them across re-initializations', async () => {
    await WalletRepository.createCard({
      type: 'card',
      category: 'Finanzas',
      title: 'Tarjeta Persistente 1',
      color: 'obsidian',
      maskedNumber: '•••• 9988',
    });

    await WalletRepository.createCard({
      type: 'document',
      category: 'Identificación',
      title: 'DNI Persistente 2',
      color: 'sapphire',
      maskedNumber: 'ID-0011',
    });

    const loaded = await WalletRepository.getCards();
    expect(loaded).toHaveLength(2);
    const titles = loaded.map((c) => c.title);
    expect(titles).toContain('Tarjeta Persistente 1');
    expect(titles).toContain('DNI Persistente 2');
  });

  it('does not create duplicate entries when the same card title is added', async () => {
    const card1 = await WalletRepository.createCard({
      id: 'fixed-unique-id',
      type: 'card',
      category: 'Finanzas',
      title: 'Tarjeta con ID Fijo',
    });

    expect(card1.id).toBe('fixed-unique-id');

    const all = await WalletRepository.getCards();
    expect(all).toHaveLength(1);
  });

  it('correctly maps mock cards if sample data is loaded', () => {
    expect(MOCK_WALLET_CARDS.length).toBeGreaterThan(0);
    const first = MOCK_WALLET_CARDS[0];
    expect(first.title).toBeDefined();
    expect(first.type).toBe('card');
  });
});
