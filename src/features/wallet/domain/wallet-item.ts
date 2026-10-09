export const WALLET_ITEM_TYPES = [
  'card',
  'document',
  'membership',
  'ticket',
  'credential',
  'custom',
] as const;

export type WalletItemType = (typeof WALLET_ITEM_TYPES)[number];

export interface WalletItem<TDetails extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: WalletItemType;
  category: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageId: string | null;
  color: string | null;
  icon: string | null;
  details: TDetails;
  createdAt: string;
  updatedAt: string;
}

/**
 * Detalles específicos para elementos de tipo 'card' (tarjetas bancarias, débito, lealtad).
 * INVARIANTE ESTRICTA DE SEGURIDAD:
 * NUNCA almacenar CVV, CVC, PIN ni números completos (PAN).
 * Solo se permiten últimos cuatro dígitos y metadatos no sensibles de presentación.
 */
export interface CardDetails extends Record<string, unknown> {
  lastFourDigits?: string;
  maskedNumber?: string;
  issuer?: string;
  holder?: string;
  expiresText?: string;
  cardType?: 'debit' | 'credit' | 'prepaid' | 'gift' | 'loyalty';
  network?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  badgeLabel?: string;
}

export type CardWalletItem = WalletItem<CardDetails>;

export interface CreateWalletItemInput<TDetails extends Record<string, unknown> = Record<string, unknown>> {
  type: WalletItemType;
  category: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageId?: string | null;
  color?: string | null;
  icon?: string | null;
  details?: TDetails;
}

export interface UpdateWalletItemInput<TDetails extends Record<string, unknown> = Record<string, unknown>> {
  category?: string;
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  imageId?: string | null;
  color?: string | null;
  icon?: string | null;
  details?: TDetails;
}

export interface CreateCardInput {
  title: string;
  category?: string;
  subtitle?: string | null;
  description?: string | null;
  imageId?: string | null;
  color?: string | null;
  icon?: string | null;
  lastFourDigits?: string;
  issuer?: string;
  holder?: string;
  expiresText?: string;
  cardType?: 'debit' | 'credit' | 'prepaid' | 'gift' | 'loyalty';
  network?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  badgeLabel?: string;
  additionalDetails?: Record<string, unknown>;
}

export interface UpdateCardInput {
  title?: string;
  category?: string;
  subtitle?: string | null;
  description?: string | null;
  imageId?: string | null;
  color?: string | null;
  icon?: string | null;
  lastFourDigits?: string;
  issuer?: string;
  holder?: string;
  expiresText?: string;
  cardType?: 'debit' | 'credit' | 'prepaid' | 'gift' | 'loyalty';
  network?: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  badgeLabel?: string;
  additionalDetails?: Record<string, unknown>;
}

export interface WalletItemFilter {
  type?: WalletItemType;
  category?: string;
  searchQuery?: string;
}
