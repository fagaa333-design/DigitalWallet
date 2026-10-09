jest.mock('expo-secure-store', () => jest.requireActual('./mocks/secure-store').secureStoreMock);
jest.mock('expo-file-system', () => jest.requireActual('./mocks/file-system'));
jest.mock('expo-sqlite', () => jest.requireActual('./mocks/expo-sqlite'));

import { initializeWalletKeys } from '@/shared/security/key-manager';
import {
  createCard,
  createWalletItem,
  deleteWalletItem,
  getAllCards,
  getAllWalletItems,
  getCardById,
  getWalletItemById,
  updateCard,
  updateWalletItem,
  walletRepository,
} from '@/features/wallet/data/wallet-repository';
import { storeWalletFile, readWalletFile } from '@/shared/storage/wallet-files';
import { fileSystemMock, Directory, File, Paths } from './mocks/file-system';
import { secureStoreMock } from './mocks/secure-store';
import { sqliteMock } from './mocks/expo-sqlite';

beforeEach(async () => {
  secureStoreMock.reset();
  fileSystemMock.reset();
  sqliteMock.reset(2, true);
  await initializeWalletKeys();
});

describe('wallet-repository CRUD', () => {
  it('creates and retrieves a general wallet item', async () => {
    const item = await createWalletItem({
      type: 'document',
      category: 'Identidad',
      title: 'Pasaporte Nacional',
      subtitle: 'Ministerio de Relaciones Exteriores',
      description: 'Documento de viaje oficial',
      details: { docType: 'passport', country: 'CO' },
    });

    expect(item.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(item.type).toBe('document');
    expect(item.title).toBe('Pasaporte Nacional');
    expect(item.details).toEqual({ docType: 'passport', country: 'CO' });

    const fetched = await getWalletItemById(item.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(item.id);
    expect(fetched?.title).toBe('Pasaporte Nacional');
  });

  it('lists items with type and category filters', async () => {
    await createWalletItem({
      type: 'document',
      category: 'Identidad',
      title: 'DNI',
    });
    await createWalletItem({
      type: 'membership',
      category: 'Gimnasio',
      title: 'Pase Fitness',
    });

    const all = await getAllWalletItems();
    expect(all.length).toBe(2);

    const docsOnly = await getAllWalletItems({ type: 'document' });
    expect(docsOnly.length).toBe(1);
    expect(docsOnly[0].title).toBe('DNI');

    const gymOnly = await getAllWalletItems({ category: 'Gimnasio' });
    expect(gymOnly.length).toBe(1);
    expect(gymOnly[0].title).toBe('Pase Fitness');
  });

  it('updates an existing item metadata', async () => {
    const item = await createWalletItem({
      type: 'ticket',
      category: 'Viajes',
      title: 'Boleto de Avión',
      subtitle: 'Vuelo AV120',
    });

    const updated = await updateWalletItem(item.id, {
      title: 'Boleto de Avión - Confirmado',
      subtitle: 'Puerta 4',
      details: { seat: '12A' },
    });

    expect(updated.title).toBe('Boleto de Avión - Confirmado');
    expect(updated.subtitle).toBe('Puerta 4');
    expect(updated.details).toEqual({ seat: '12A' });
  });

  it('deletes an item from the database', async () => {
    const item = await createWalletItem({
      type: 'custom',
      category: 'Notas',
      title: 'Nota Segura',
    });

    const deleted = await deleteWalletItem(item.id);
    expect(deleted).toBe(true);

    const fetched = await getWalletItemById(item.id);
    expect(fetched).toBeNull();

    const secondDelete = await deleteWalletItem(item.id);
    expect(secondDelete).toBe(false);
  });
});

describe('wallet-repository secure file cleanup', () => {
  it('deletes the associated encrypted file when an item is deleted', async () => {
    const fileBytes = new TextEncoder().encode('imagen_cifrada_segura');
    const imageId = await storeWalletFile(fileBytes);

    const item = await createWalletItem({
      type: 'document',
      category: 'Identidad',
      title: 'Licencia de Conducir',
      imageId,
    });

    const encryptedFile = new File(
      new Directory(Paths.document, 'wallet-items-encrypted'),
      `${imageId}.dwf`,
    );
    expect(encryptedFile.exists).toBe(true);

    const deleted = await deleteWalletItem(item.id);
    expect(deleted).toBe(true);
    expect(encryptedFile.exists).toBe(false);
  });

  it('deletes old encrypted file when an item imageId is updated to a new one', async () => {
    const oldImageId = await storeWalletFile(new TextEncoder().encode('foto_vieja'));
    const newImageId = await storeWalletFile(new TextEncoder().encode('foto_nueva'));

    const item = await createWalletItem({
      type: 'document',
      category: 'Identidad',
      title: 'DNI',
      imageId: oldImageId,
    });

    const oldFile = new File(
      new Directory(Paths.document, 'wallet-items-encrypted'),
      `${oldImageId}.dwf`,
    );
    const newFile = new File(
      new Directory(Paths.document, 'wallet-items-encrypted'),
      `${newImageId}.dwf`,
    );

    expect(oldFile.exists).toBe(true);
    expect(newFile.exists).toBe(true);

    await updateWalletItem(item.id, { imageId: newImageId });

    expect(oldFile.exists).toBe(false);
    expect(newFile.exists).toBe(true);
  });
});

describe('card security and sensitive data prevention', () => {
  it('creates and formats card with lastFourDigits and maskedNumber safely', async () => {
    const card = await createCard({
      title: 'Tarjeta Débito Platinum',
      issuer: 'Apex Global Bank',
      holder: 'JUAN DAVID MAYA',
      lastFourDigits: '8824',
      expiresText: '09/29',
      cardType: 'debit',
      network: 'visa',
      badgeLabel: 'Principal',
    });

    expect(card.type).toBe('card');
    expect(card.category).toBe('Finanzas');
    expect(card.details.lastFourDigits).toBe('8824');
    expect(card.details.maskedNumber).toBe('•••• 8824');
    expect(card.details.issuer).toBe('Apex Global Bank');
    expect(card.details.holder).toBe('JUAN DAVID MAYA');
    expect(card.details.cardType).toBe('debit');

    const retrieved = await getCardById(card.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.details.maskedNumber).toBe('•••• 8824');
  });

  it('rejects storing CVV or CVC in card details', async () => {
    await expect(
      createCard({
        title: 'Tarjeta Insegura',
        additionalDetails: {
          cvv: '123',
        },
      }),
    ).rejects.toThrow(/Security violation.*Sensitive card credential.*cvv/i);

    await expect(
      createCard({
        title: 'Tarjeta Insegura',
        additionalDetails: {
          nested: {
            cvc: '999',
          },
        },
      }),
    ).rejects.toThrow(/Security violation.*Sensitive card credential/i);
  });

  it('rejects storing PIN or password in card details', async () => {
    await expect(
      createCard({
        title: 'Tarjeta con PIN',
        additionalDetails: {
          pin: '4321',
        },
      }),
    ).rejects.toThrow(/Security violation.*Sensitive card credential.*pin/i);
  });

  it('rejects storing full card numbers (PAN)', async () => {
    await expect(
      createCard({
        title: 'Tarjeta con PAN completo',
        additionalDetails: {
          accountReference: '4532015099882412',
        },
      }),
    ).rejects.toThrow(/Full card number detected/i);
  });

  it('validates lastFourDigits format strictly (rejects non-4-digit strings)', async () => {
    await expect(
      createCard({
        title: 'Tarjeta Invalida',
        lastFourDigits: '12345',
      }),
    ).rejects.toThrow('Invalid lastFourDigits: Must be exactly 4 digits.');

    await expect(
      createCard({
        title: 'Tarjeta Invalida',
        lastFourDigits: '12a4',
      }),
    ).rejects.toThrow('Invalid lastFourDigits: Must be exactly 4 digits.');
  });

  it('updates card details while maintaining security invariants', async () => {
    const card = await createCard({
      title: 'Tarjeta Inicial',
      lastFourDigits: '1111',
      holder: 'USUARIO',
    });

    const updated = await updateCard(card.id, {
      title: 'Tarjeta Renombrada',
      lastFourDigits: '2222',
      badgeLabel: 'Secundaria',
    });

    expect(updated.title).toBe('Tarjeta Renombrada');
    expect(updated.details.lastFourDigits).toBe('2222');
    expect(updated.details.maskedNumber).toBe('•••• 2222');
    expect(updated.details.holder).toBe('USUARIO');
  });

  it('lists only items of type card via getAllCards', async () => {
    await createCard({ title: 'Tarjeta 1' });
    await createCard({ title: 'Tarjeta 2' });
    await createWalletItem({ type: 'document', category: 'ID', title: 'Pasaporte' });

    const cards = await getAllCards();
    expect(cards.length).toBe(2);
    expect(cards.every((c) => c.type === 'card')).toBe(true);
  });

  it('returns null for getCardById when the ID corresponds to another item type', async () => {
    const doc = await createWalletItem({
      type: 'document',
      category: 'ID',
      title: 'DNI',
    });

    const card = await getCardById(doc.id);
    expect(card).toBeNull();
  });

  it('rejects invalid UUID identifiers to prevent malformed queries', async () => {
    await expect(getWalletItemById('invalid-id')).rejects.toThrow(
      'Invalid wallet item identifier.',
    );
    await expect(deleteWalletItem('../secret/id')).rejects.toThrow(
      'Invalid wallet item identifier.',
    );
  });
});
