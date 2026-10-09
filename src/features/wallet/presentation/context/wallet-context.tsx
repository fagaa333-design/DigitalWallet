import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { randomUUID } from 'expo-crypto';
import { CardPresentationItem } from '../types/presentation-types';
import { MOCK_WALLET_CARDS } from '../data/mock-cards';
import { WalletItemType } from '../../domain/wallet-item';

export interface CreateCardInput {
  type: WalletItemType;
  category: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  badgeLabel?: string;
  maskedNumber?: string;
  issuer?: string;
  expiresText?: string;
  details?: Record<string, unknown>;
}

export interface WalletContextValue {
  cards: CardPresentationItem[];
  loading: boolean;
  error: string | null;
  addCard: (input: CreateCardInput) => Promise<CardPresentationItem>;
  deleteCard: (id: string) => Promise<boolean>;
  getCardById: (id: string) => CardPresentationItem | undefined;
  refreshCards: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
  initialCards?: CardPresentationItem[];
}

export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  initialCards = MOCK_WALLET_CARDS,
}) => {
  const [cards, setCards] = useState<CardPresentationItem[]>(initialCards);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshCards = useCallback(async () => {
    setLoading(true);
    try {
      // Simulated refresh delay for smooth mobile UX
      await new Promise((resolve) => setTimeout(resolve, 300));
      clearError();
    } catch {
      setError('No se pudieron actualizar los elementos de la billetera.');
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  const getCardById = useCallback(
    (id: string): CardPresentationItem | undefined => {
      return cards.find((c) => c.id === id);
    },
    [cards],
  );

  const addCard = useCallback(
    async (input: CreateCardInput): Promise<CardPresentationItem> => {
      setLoading(true);
      try {
        if (!input.title.trim()) {
          throw new Error('El título de la tarjeta o documento es obligatorio.');
        }

        const now = new Date().toISOString();
        const id = `card-${randomUUID()}`;

        const newCard: CardPresentationItem = {
          id,
          type: input.type,
          category: input.category || 'Otras',
          title: input.title.trim(),
          subtitle: input.subtitle?.trim() || null,
          description: input.description?.trim() || null,
          imageId: null,
          color: input.color || 'obsidian',
          icon: input.icon || 'card',
          badgeLabel: input.badgeLabel || input.category,
          maskedNumber: input.maskedNumber?.trim() || '•••• ••••',
          issuer: input.issuer?.trim() || input.subtitle?.trim() || 'Emisor Desconocido',
          expiresText: input.expiresText?.trim() || undefined,
          details: input.details || {},
          createdAt: now,
          updatedAt: now,
        };

        // Simulated processing
        await new Promise((resolve) => setTimeout(resolve, 200));

        setCards((prev) => [newCard, ...prev]);
        clearError();
        return newCard;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Error desconocido al añadir la tarjeta.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clearError],
  );

  const deleteCard = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      try {
        const exists = cards.some((c) => c.id === id);
        if (!exists) {
          throw new Error('El elemento que intentas eliminar no existe.');
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
        setCards((prev) => prev.filter((c) => c.id !== id));
        clearError();
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Error desconocido al eliminar la tarjeta.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [cards, clearError],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      cards,
      loading,
      error,
      addCard,
      deleteCard,
      getCardById,
      refreshCards,
      clearError,
    }),
    [cards, loading, error, addCard, deleteCard, getCardById, refreshCards, clearError],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet debe utilizarse dentro de un WalletProvider.');
  }
  return context;
}

