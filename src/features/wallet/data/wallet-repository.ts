import { randomUUID } from 'expo-crypto';
import { getWalletDatabase } from './wallet-database';
import {
  CardDetails,
  CardWalletItem,
  CreateCardInput,
  CreateWalletItemInput,
  UpdateCardInput,
  UpdateWalletItemInput,
  WALLET_ITEM_TYPES,
  WalletItem,
  WalletItemFilter,
  WalletItemType,
} from '../domain/wallet-item';
import { deleteWalletFile } from '@/shared/storage/wallet-files';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORBIDDEN_SENSITIVE_KEYS = [
  'cvv',
  'cvc',
  'cid',
  'pin',
  'password',
  'pan',
  'cardnumber',
  'fullcardnumber',
  'track1',
  'track2',
];

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

function assertValidUuid(id: string): void {
  if (!UUID_PATTERN.test(id)) {
    throw new Error('Invalid wallet item identifier.');
  }
}

function assertValidItemType(type: string): asserts type is WalletItemType {
  if (!WALLET_ITEM_TYPES.includes(type as WalletItemType)) {
    throw new Error(`Unsupported wallet item type: '${type}'.`);
  }
}

/**
 * Valida que ningún campo sensible (CVV, CVC, PIN o número completo) sea persistido.
 */
export function assertNoSensitiveCardData(data: Record<string, unknown>): void {
  const checkObject = (obj: Record<string, unknown>, path = '') => {
    for (const key of Object.keys(obj)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (FORBIDDEN_SENSITIVE_KEYS.includes(normalizedKey)) {
        throw new Error(
          `Security violation: Sensitive card credential '${path}${key}' must never be stored.`,
        );
      }

      const value = obj[key];
      if (typeof value === 'string') {
        const digitsOnly = value.replace(/\D/g, '');
        // Rechazar números de tarjeta completos (13 a 19 dígitos continuos)
        if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
          throw new Error(
            `Security violation: Full card number detected in '${path}${key}'. Store only the last 4 digits.`,
          );
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        checkObject(value as Record<string, unknown>, `${path}${key}.`);
      }
    }
  };

  checkObject(data);
}

function sanitizeAndFormatCardDetails(input: {
  lastFourDigits?: string;
  issuer?: string;
  holder?: string;
  expiresText?: string;
  cardType?: 'debit' | 'credit' | 'prepaid' | 'gift' | 'loyalty';
  network?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  badgeLabel?: string;
  additionalDetails?: Record<string, unknown>;
}): CardDetails {
  if (input.additionalDetails) {
    assertNoSensitiveCardData(input.additionalDetails);
  }

  let lastFour = input.lastFourDigits;
  let masked = '';

  if (lastFour !== undefined) {
    const cleanLastFour = lastFour.replace(/\s+/g, '');
    if (!/^\d{4}$/.test(cleanLastFour)) {
      throw new Error('Invalid lastFourDigits: Must be exactly 4 digits.');
    }
    lastFour = cleanLastFour;
    masked = `•••• ${lastFour}`;
  }

  return {
    ...(input.additionalDetails ?? {}),
    lastFourDigits: lastFour,
    maskedNumber: masked || undefined,
    issuer: input.issuer?.trim() || undefined,
    holder: input.holder?.trim() || undefined,
    expiresText: input.expiresText?.trim() || undefined,
    cardType: input.cardType,
    network: input.network,
    badgeLabel: input.badgeLabel?.trim() || undefined,
  };
}

function mapRowToWalletItem<TDetails extends Record<string, unknown> = Record<string, unknown>>(
  row: WalletItemRow,
): WalletItem<TDetails> {
  assertValidItemType(row.type);

  let details: TDetails = {} as TDetails;
  if (row.details_json) {
    try {
      details = JSON.parse(row.details_json) as TDetails;
    } catch {
      details = {} as TDetails;
    }
  }

  return {
    id: row.id,
    type: row.type,
    category: row.category,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    imageId: row.image_id,
    color: row.color,
    icon: row.icon,
    details,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Crea un nuevo elemento en la billetera protegida por SQLCipher.
 */
export async function createWalletItem<
  TDetails extends Record<string, unknown> = Record<string, unknown>,
>(input: CreateWalletItemInput<TDetails>): Promise<WalletItem<TDetails>> {
  assertValidItemType(input.type);
  if (!input.title || !input.title.trim()) {
    throw new Error('Wallet item title cannot be empty.');
  }

  if (input.details) {
    assertNoSensitiveCardData(input.details);
  }

  const database = await getWalletDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();
  const detailsJson = JSON.stringify(input.details ?? {});

  await database.runAsync(
    `INSERT INTO wallet_items (
      id, type, category, title, subtitle, description,
      image_id, color, icon, details_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    id,
    input.type,
    input.category.trim(),
    input.title.trim(),
    input.subtitle?.trim() ?? null,
    input.description?.trim() ?? null,
    input.imageId ?? null,
    input.color ?? null,
    input.icon ?? null,
    detailsJson,
    now,
    now,
  );

  return {
    id,
    type: input.type,
    category: input.category.trim(),
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() ?? null,
    description: input.description?.trim() ?? null,
    imageId: input.imageId ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
    details: input.details ?? ({} as TDetails),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Obtiene un elemento por su identificador único UUID.
 */
export async function getWalletItemById<
  TDetails extends Record<string, unknown> = Record<string, unknown>,
>(id: string): Promise<WalletItem<TDetails> | null> {
  assertValidUuid(id);
  const database = await getWalletDatabase();

  const row = await database.getFirstAsync<WalletItemRow>(
    `SELECT id, type, category, title, subtitle, description,
            image_id, color, icon, details_json, created_at, updated_at
     FROM wallet_items
     WHERE id = ?;`,
    id,
  );

  if (!row) {
    return null;
  }

  return mapRowToWalletItem<TDetails>(row);
}

/**
 * Lista todos los elementos de la billetera con soporte opcional de filtros.
 */
export async function getAllWalletItems(
  filter?: WalletItemFilter,
): Promise<WalletItem[]> {
  const database = await getWalletDatabase();

  let query = `
    SELECT id, type, category, title, subtitle, description,
           image_id, color, icon, details_json, created_at, updated_at
    FROM wallet_items
  `;
  type SQLiteBindValue = string | number | null | Uint8Array;
  const conditions: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (filter?.type) {
    assertValidItemType(filter.type);
    conditions.push('type = ?');
    params.push(filter.type);
  }

  if (filter?.category && filter.category !== 'all') {
    conditions.push('category = ?');
    params.push(filter.category);
  }

  if (filter?.searchQuery && filter.searchQuery.trim()) {
    conditions.push('(title LIKE ? OR subtitle LIKE ? OR description LIKE ?)');
    const searchPattern = `%${filter.searchQuery.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY updated_at DESC;';

  const rows = await database.getAllAsync<WalletItemRow>(query, params);
  return rows.map((row) => mapRowToWalletItem(row));
}


/**
 * Actualiza un elemento existente de la billetera.
 */
export async function updateWalletItem<
  TDetails extends Record<string, unknown> = Record<string, unknown>,
>(
  id: string,
  input: UpdateWalletItemInput<TDetails>,
): Promise<WalletItem<TDetails>> {
  assertValidUuid(id);
  const existing = await getWalletItemById<TDetails>(id);
  if (!existing) {
    throw new Error(`Wallet item with id '${id}' not found.`);
  }

  if (input.details) {
    assertNoSensitiveCardData(input.details);
  }

  // Si se cambia la imagen asociada, eliminar de forma segura el archivo cifrado anterior
  if (
    existing.imageId &&
    input.imageId !== undefined &&
    input.imageId !== existing.imageId
  ) {
    try {
      deleteWalletFile(existing.imageId);
    } catch {
      // Continuar para preservar la consistencia de la base de datos
    }
  }

  const database = await getWalletDatabase();
  const now = new Date().toISOString();
  const updatedCategory = input.category !== undefined ? input.category.trim() : existing.category;
  const updatedTitle = input.title !== undefined ? input.title.trim() : existing.title;
  const updatedSubtitle = input.subtitle !== undefined ? input.subtitle : existing.subtitle;
  const updatedDescription =
    input.description !== undefined ? input.description : existing.description;
  const updatedImageId = input.imageId !== undefined ? input.imageId : existing.imageId;
  const updatedColor = input.color !== undefined ? input.color : existing.color;
  const updatedIcon = input.icon !== undefined ? input.icon : existing.icon;
  const updatedDetails = input.details !== undefined ? input.details : existing.details;
  const detailsJson = JSON.stringify(updatedDetails);

  await database.runAsync(
    `UPDATE wallet_items
     SET category = ?, title = ?, subtitle = ?, description = ?,
         image_id = ?, color = ?, icon = ?, details_json = ?, updated_at = ?
     WHERE id = ?;`,
    updatedCategory,
    updatedTitle,
    updatedSubtitle,
    updatedDescription,
    updatedImageId,
    updatedColor,
    updatedIcon,
    detailsJson,
    now,
    id,
  );

  return {
    id,
    type: existing.type,
    category: updatedCategory,
    title: updatedTitle,
    subtitle: updatedSubtitle,
    description: updatedDescription,
    imageId: updatedImageId,
    color: updatedColor,
    icon: updatedIcon,
    details: updatedDetails,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
}

/**
 * Elimina un elemento de la base de datos y su archivo binario cifrado asociado (si existe).
 */
export async function deleteWalletItem(id: string): Promise<boolean> {
  assertValidUuid(id);
  const existing = await getWalletItemById(id);
  if (!existing) {
    return false;
  }

  const database = await getWalletDatabase();
  await database.runAsync('DELETE FROM wallet_items WHERE id = ?;', id);

  if (existing.imageId) {
    try {
      deleteWalletFile(existing.imageId);
    } catch {
      // No detener la eliminación lógica
    }
  }

  return true;
}

// ==========================================
// OPERACIONES ESPECIALIZADAS PARA TARJETAS
// ==========================================

/**
 * Crea una tarjeta en la billetera garantizando validaciones de seguridad estrictas.
 */
export async function createCard(input: CreateCardInput): Promise<CardWalletItem> {
  const details = sanitizeAndFormatCardDetails({
    lastFourDigits: input.lastFourDigits,
    issuer: input.issuer,
    holder: input.holder,
    expiresText: input.expiresText,
    cardType: input.cardType,
    network: input.network,
    badgeLabel: input.badgeLabel,
    additionalDetails: input.additionalDetails,
  });

  return createWalletItem<CardDetails>({
    type: 'card',
    category: input.category?.trim() || 'Finanzas',
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || input.issuer?.trim() || null,
    description: input.description?.trim() || null,
    imageId: input.imageId ?? null,
    color: input.color ?? null,
    icon: input.icon ?? 'card',
    details,
  });
}

/**
 * Obtiene una tarjeta por su UUID.
 */
export async function getCardById(id: string): Promise<CardWalletItem | null> {
  const item = await getWalletItemById<CardDetails>(id);
  if (!item || item.type !== 'card') {
    return null;
  }
  return item;
}

/**
 * Lista todas las tarjetas guardadas en la billetera.
 */
export async function getAllCards(category?: string): Promise<CardWalletItem[]> {
  const items = await getAllWalletItems({
    type: 'card',
    category,
  });
  return items as CardWalletItem[];
}

/**
 * Actualiza una tarjeta existente garantizando que no se filtren datos sensibles.
 */
export async function updateCard(
  id: string,
  input: UpdateCardInput,
): Promise<CardWalletItem> {
  const existing = await getCardById(id);
  if (!existing) {
    throw new Error(`Card with id '${id}' not found.`);
  }

  let updatedDetails: CardDetails = { ...existing.details };
  if (
    input.lastFourDigits !== undefined ||
    input.issuer !== undefined ||
    input.holder !== undefined ||
    input.expiresText !== undefined ||
    input.cardType !== undefined ||
    input.network !== undefined ||
    input.badgeLabel !== undefined ||
    input.additionalDetails !== undefined
  ) {
    const sanitized = sanitizeAndFormatCardDetails({
      lastFourDigits:
        input.lastFourDigits !== undefined
          ? input.lastFourDigits
          : existing.details.lastFourDigits,
      issuer: input.issuer !== undefined ? input.issuer : existing.details.issuer,
      holder: input.holder !== undefined ? input.holder : existing.details.holder,
      expiresText:
        input.expiresText !== undefined
          ? input.expiresText
          : existing.details.expiresText,
      cardType: input.cardType !== undefined ? input.cardType : existing.details.cardType,
      network: input.network !== undefined ? input.network : existing.details.network,
      badgeLabel:
        input.badgeLabel !== undefined ? input.badgeLabel : existing.details.badgeLabel,
      additionalDetails: input.additionalDetails,
    });
    updatedDetails = { ...updatedDetails, ...sanitized };
  }

  const updatedItem = await updateWalletItem<CardDetails>(id, {
    category: input.category,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    imageId: input.imageId,
    color: input.color,
    icon: input.icon,
    details: updatedDetails,
  });

  return updatedItem as CardWalletItem;
}

/**
 * Objeto repositorio unificado para inyección de dependencias o consumo directo.
 */
export const walletRepository = {
  create: createWalletItem,
  getById: getWalletItemById,
  getAll: getAllWalletItems,
  update: updateWalletItem,
  delete: deleteWalletItem,
  createCard,
  getCardById,
  getAllCards,
  updateCard,
};
