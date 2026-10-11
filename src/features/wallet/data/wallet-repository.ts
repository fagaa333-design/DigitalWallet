import { randomUUID } from 'expo-crypto';
import { getWalletDatabase } from './wallet-database';
import { WalletItemType, WALLET_ITEM_TYPES } from '../domain/wallet-item';
import { CardPresentationItem } from '../presentation/types/presentation-types';
import { deleteWalletFile } from '@/shared/storage/wallet-files';

export interface CreateCardData {
  id?: string;
  type: WalletItemType;
  category: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageId?: string | null;
  color?: string | null;
  icon?: string | null;
  badgeLabel?: string;
  maskedNumber?: string;
  issuer?: string;
  expiresText?: string;
  details?: Record<string, unknown>;
}

export interface UpdateCardData {
  type?: WalletItemType;
  category?: string;
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  imageId?: string | null;
  color?: string | null;
  icon?: string | null;
  badgeLabel?: string;
  maskedNumber?: string;
  issuer?: string;
  expiresText?: string;
  details?: Record<string, unknown>;
}

interface WalletItemRow {
  id: string;
  type: string;
  category: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_id: string | null;
  color: string | null;
  icon: string | null;
  details_json: string;
  created_at: string;
  updated_at: string;
}

function isValidWalletItemType(type: unknown): type is WalletItemType {
  return typeof type === 'string' && (WALLET_ITEM_TYPES as readonly string[]).includes(type);
}

function mapRowToCard(row: WalletItemRow): CardPresentationItem {
  if (!row.id || typeof row.id !== 'string') {
    throw new Error('Invalid row: missing id');
  }

  let parsedDetails: Record<string, unknown> = {};
  if (row.details_json) {
    try {
      const parsed = JSON.parse(row.details_json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        parsedDetails = parsed as Record<string, unknown>;
      }
    } catch {
      parsedDetails = {};
    }
  }

  const { badgeLabel, maskedNumber, issuer, expiresText, ...cleanDetails } = parsedDetails;

  const type: WalletItemType = isValidWalletItemType(row.type) ? row.type : 'custom';

  return {
    id: row.id,
    type,
    category: row.category,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    imageId: row.image_id,
    color: row.color,
    icon: row.icon,
    details: cleanDetails,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    badgeLabel: typeof badgeLabel === 'string' ? badgeLabel : row.category,
    maskedNumber: typeof maskedNumber === 'string' ? maskedNumber : undefined,
    issuer: typeof issuer === 'string' ? issuer : (row.subtitle || undefined),
    expiresText: typeof expiresText === 'string' ? expiresText : undefined,
  };
}

export class WalletRepository {
  /**
   * Retrieves all wallet cards ordered by creation date descending.
   */
  static async getCards(): Promise<CardPresentationItem[]> {
    const database = await getWalletDatabase();
    const rows = await database.getAllAsync<WalletItemRow>(
      `SELECT id, type, category, title, subtitle, description, image_id, color, icon, details_json, created_at, updated_at
       FROM wallet_items
       ORDER BY created_at DESC;`,
    );

    return rows.map(mapRowToCard);
  }

  /**
   * Retrieves a single card by its unique identifier.
   */
  static async getCardById(id: string): Promise<CardPresentationItem | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }

    const database = await getWalletDatabase();
    const row = await database.getFirstAsync<WalletItemRow>(
      `SELECT id, type, category, title, subtitle, description, image_id, color, icon, details_json, created_at, updated_at
       FROM wallet_items
       WHERE id = ?;`,
      id,
    );

    if (!row) {
      return null;
    }

    return mapRowToCard(row);
  }

  /**
   * Creates and persists a new card into SQLCipher database.
   */
  static async createCard(data: CreateCardData): Promise<CardPresentationItem> {
    if (!data.title || !data.title.trim()) {
      throw new Error('El título de la tarjeta es obligatorio.');
    }
    if (!data.category || !data.category.trim()) {
      throw new Error('La categoría de la tarjeta es obligatoria.');
    }
    if (!isValidWalletItemType(data.type)) {
      throw new Error(`Tipo de tarjeta no válido: ${data.type}`);
    }

    const id = data.id && data.id.trim() ? data.id.trim() : `card-${randomUUID()}`;
    const now = new Date().toISOString();

    const detailsPayload: Record<string, unknown> = {
      ...(data.details || {}),
      ...(data.badgeLabel ? { badgeLabel: data.badgeLabel.trim() } : {}),
      ...(data.maskedNumber ? { maskedNumber: data.maskedNumber.trim() } : {}),
      ...(data.issuer ? { issuer: data.issuer.trim() } : {}),
      ...(data.expiresText ? { expiresText: data.expiresText.trim() } : {}),
    };

    const database = await getWalletDatabase();

    await database.runAsync(
      `INSERT INTO wallet_items (
        id, type, category, title, subtitle, description, image_id, color, icon, details_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      data.type,
      data.category.trim(),
      data.title.trim(),
      data.subtitle?.trim() || null,
      data.description?.trim() || null,
      data.imageId || null,
      data.color || null,
      data.icon || null,
      JSON.stringify(detailsPayload),
      now,
      now,
    );

    const createdCard = await this.getCardById(id);
    if (!createdCard) {
      throw new Error('No se pudo verificar la creación de la tarjeta en la base de datos.');
    }

    return createdCard;
  }

  /**
   * Updates an existing card in the database.
   */
  static async updateCard(id: string, data: UpdateCardData): Promise<CardPresentationItem> {
    if (!id || typeof id !== 'string') {
      throw new Error('Identificador de tarjeta no válido.');
    }

    const existingCard = await this.getCardById(id);
    if (!existingCard) {
      throw new Error(`No se encontró la tarjeta con identificador: ${id}`);
    }

    if (data.title !== undefined && !data.title.trim()) {
      throw new Error('El título de la tarjeta no puede estar vacío.');
    }
    if (data.category !== undefined && !data.category.trim()) {
      throw new Error('La categoría de la tarjeta no puede estar vacía.');
    }
    if (data.type !== undefined && !isValidWalletItemType(data.type)) {
      throw new Error(`Tipo de tarjeta no válido: ${data.type}`);
    }

    const updatedType = data.type ?? existingCard.type;
    const updatedCategory = data.category?.trim() ?? existingCard.category;
    const updatedTitle = data.title?.trim() ?? existingCard.title;
    const updatedSubtitle = data.subtitle !== undefined ? (data.subtitle?.trim() || null) : existingCard.subtitle;
    const updatedDescription = data.description !== undefined ? (data.description?.trim() || null) : existingCard.description;
    const updatedImageId = data.imageId !== undefined ? data.imageId : existingCard.imageId;
    const updatedColor = data.color !== undefined ? data.color : existingCard.color;
    const updatedIcon = data.icon !== undefined ? data.icon : existingCard.icon;
    const now = new Date().toISOString();

    const mergedDetails: Record<string, unknown> = {
      ...existingCard.details,
      ...(data.details || {}),
      badgeLabel: data.badgeLabel !== undefined ? data.badgeLabel : existingCard.badgeLabel,
      maskedNumber: data.maskedNumber !== undefined ? data.maskedNumber : existingCard.maskedNumber,
      issuer: data.issuer !== undefined ? data.issuer : existingCard.issuer,
      expiresText: data.expiresText !== undefined ? data.expiresText : existingCard.expiresText,
    };

    const database = await getWalletDatabase();

    await database.runAsync(
      `UPDATE wallet_items
       SET type = ?, category = ?, title = ?, subtitle = ?, description = ?, image_id = ?, color = ?, icon = ?, details_json = ?, updated_at = ?
       WHERE id = ?;`,
      updatedType,
      updatedCategory,
      updatedTitle,
      updatedSubtitle,
      updatedDescription,
      updatedImageId,
      updatedColor,
      updatedIcon,
      JSON.stringify(mergedDetails),
      now,
      id,
    );

    const updatedCard = await this.getCardById(id);
    if (!updatedCard) {
      throw new Error('No se pudo verificar la actualización de la tarjeta.');
    }

    return updatedCard;
  }

  /**
   * Deletes a card and cleans up any linked encrypted wallet file.
   */
  static async deleteCard(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string') {
      return false;
    }

    const card = await this.getCardById(id);
    if (!card) {
      return false;
    }

    // Clean up encrypted image file if associated
    if (card.imageId) {
      try {
        deleteWalletFile(card.imageId);
      } catch {
        // Continue with row deletion even if file was already removed
      }
    }

    const database = await getWalletDatabase();
    await database.runAsync('DELETE FROM wallet_items WHERE id = ?;', id);

    return true;
  }
}

