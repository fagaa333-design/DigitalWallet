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
