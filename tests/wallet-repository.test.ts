jest.mock('expo-secure-store', () => jest.requireActual('./mocks/secure-store').secureStoreMock);
jest.mock('expo-file-system', () => jest.requireActual('./mocks/file-system'));
jest.mock('expo-sqlite', () => jest.requireActual('./mocks/expo-sqlite'));

import { initializeWalletKeys } from '@/shared/security/key-manager';
import { WalletRepository } from '@/features/wallet/data/wallet-repository';
import { secureStoreMock } from './mocks/secure-store';
import { fileSystemMock } from './mocks/file-system';
import { sqliteMock } from './mocks/expo-sqlite';
import * as walletFiles from '@/shared/storage/wallet-files';

describe('WalletRepository', () => {
  beforeEach(async () => {
    secureStoreMock.reset();
    fileSystemMock.reset();
    sqliteMock.reset(2, true);
    await initializeWalletKeys();
  });

  it('creates and retrieves a card successfully', async () => {
    const created = await WalletRepository.createCard({
      type: 'card',
      category: 'Finanzas',
      title: 'Tarjeta Platinum',
      subtitle: 'Banco Internacional',
      description: 'Tarjeta preferencial',
      color: 'sapphire',
      icon: 'card',
      badgeLabel: 'Crédito',
      maskedNumber: '•••• 4321',
      issuer: 'Banco Internacional',
      expiresText: '11/30',
      details: { limit: 5000 },
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Tarjeta Platinum');
    expect(created.category).toBe('Finanzas');
    expect(created.badgeLabel).toBe('Crédito');
    expect(created.maskedNumber).toBe('•••• 4321');
    expect(created.details.limit).toBe(5000);

    const allCards = await WalletRepository.getCards();
    expect(allCards).toHaveLength(1);
    expect(allCards[0].id).toBe(created.id);
    expect(allCards[0].title).toBe('Tarjeta Platinum');

    const singleCard = await WalletRepository.getCardById(created.id);
    expect(singleCard).toBeDefined();
    expect(singleCard?.id).toBe(created.id);
  });

  it('returns null when querying a non-existent card', async () => {
    const card = await WalletRepository.getCardById('non-existent-id');
    expect(card).toBeNull();
  });

  it('rejects card creation when required fields are missing or invalid', async () => {
    await expect(
      WalletRepository.createCard({
        type: 'card',
        category: 'Finanzas',
        title: '   ',
      }),
    ).rejects.toThrow('El título de la tarjeta es obligatorio.');

    await expect(
      WalletRepository.createCard({
        type: 'card',
        category: '  ',
        title: 'Mi Tarjeta',
      }),
    ).rejects.toThrow('La categoría de la tarjeta es obligatoria.');

    await expect(
      WalletRepository.createCard({
        type: 'invalid-type' as any,
        category: 'Finanzas',
        title: 'Mi Tarjeta',
      }),
    ).rejects.toThrow('Tipo de tarjeta no válido');
  });

  it('updates an existing card preserving unaffected fields', async () => {
    const created = await WalletRepository.createCard({
      type: 'document',
      category: 'Identificación',
      title: 'DNI Nacional',
      subtitle: 'Gobierno',
      maskedNumber: 'ID-1234',
      color: 'slate',
      details: { country: 'AR' },
    });

    const updated = await WalletRepository.updateCard(created.id, {
      title: 'DNI Electrónico',
      color: 'sapphire',
      details: { chipEnabled: true },
    });

    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe('DNI Electrónico');
    expect(updated.color).toBe('sapphire');
    expect(updated.subtitle).toBe('Gobierno'); // Preserved
    expect(updated.maskedNumber).toBe('ID-1234'); // Preserved
    expect(updated.details.country).toBe('AR'); // Preserved
    expect(updated.details.chipEnabled).toBe(true); // Added
  });

  it('deletes a card and cleans up associated encrypted file', async () => {
    const deleteFileSpy = jest.spyOn(walletFiles, 'deleteWalletFile').mockImplementation(() => {});

    const created = await WalletRepository.createCard({
      type: 'card',
      category: 'Finanzas',
      title: 'Tarjeta Para Borrar',
      imageId: '90000000-0000-4000-8000-000000000001',
    });

    const deleted = await WalletRepository.deleteCard(created.id);
    expect(deleted).toBe(true);

    expect(deleteFileSpy).toHaveBeenCalledWith('90000000-0000-4000-8000-000000000001');

    const remaining = await WalletRepository.getCards();
    expect(remaining).toHaveLength(0);

    const recheck = await WalletRepository.getCardById(created.id);
    expect(recheck).toBeNull();

    deleteFileSpy.mockRestore();
  });

  it('handles database query error without swallowing', async () => {
    sqliteMock.database.getAllAsync.mockRejectedValueOnce(new Error('Disk I/O error'));

    await expect(WalletRepository.getCards()).rejects.toThrow('Disk I/O error');
  });
});

