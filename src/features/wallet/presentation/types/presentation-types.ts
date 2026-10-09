import { WalletItem, WalletItemType } from '../../domain/wallet-item';

export type CategoryFilterKey =
  | 'all'
  | 'Identificación'
  | 'Finanzas'
  | 'Estudio'
  | 'Transporte'
  | 'Membresías'
  | 'Otras';

export interface CategoryOption {
  key: CategoryFilterKey;
  label: string;
  iconName: string;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'all', label: 'Todas', iconName: 'wallet' },
  { key: 'Identificación', label: 'Identificación', iconName: 'badge' },
  { key: 'Finanzas', label: 'Finanzas', iconName: 'card' },
  { key: 'Estudio', label: 'Estudio', iconName: 'book' },
  { key: 'Transporte', label: 'Transporte', iconName: 'transit' },
  { key: 'Membresías', label: 'Membresías', iconName: 'star' },
  { key: 'Otras', label: 'Otras', iconName: 'tag' },
];

export interface CardPresentationItem extends WalletItem {
  badgeLabel?: string;
  maskedNumber?: string;
  issuer?: string;
  expiresText?: string;
}

