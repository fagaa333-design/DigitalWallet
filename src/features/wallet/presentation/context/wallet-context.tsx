import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { CardPresentationItem } from '../types/presentation-types';
import { MOCK_WALLET_CARDS } from '../data/mock-cards';
import {
  WalletRepository,
  CreateCardData,
  UpdateCardData,
} from '../../data/wallet-repository';

export type { CreateCardData as CreateCardInput };

export interface WalletContextValue {
  cards: CardPresentationItem[];
  loading: boolean;
  error: string | null;
  addCard: (input: CreateCardData) => Promise<CardPresentationItem>;
  updateCard: (id: string, input: UpdateCardData) => Promise<CardPresentationItem>;
  deleteCard: (id: string) => Promise<boolean>;
  getCardById: (id: string) => CardPresentationItem | undefined;
  refreshCards: () => Promise<void>;
  loadSampleCards: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export interface WalletProviderProps {
  children: ReactNode;
  initialCards?: CardPresentationItem[];
}

export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  initialCards,
}) => {
  const [cards, setCards] = useState<CardPresentationItem[]>(initialCards ?? []);
  const [loading, setLoading] = useState<boolean>(initialCards === undefined);
  const [error, setError] = useState<string | null>(null);

  // Concurrency guard to prevent conflicting simultaneous database writes
  const isBusyRef = useRef<boolean>(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshCards = useCallback(async () => {
    setLoading(true);
    try {
      const persistedCards = await WalletRepository.getCards();
      setCards(persistedCards);
      clearError();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudieron actualizar los elementos de la billetera.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [clearError]);

  // Load from encrypted database on initial mount if initialCards was not explicitly injected
  useEffect(() => {
    if (initialCards !== undefined) {
      return;
    }

    let isMounted = true;

    const loadPersistedCards = async () => {
      setLoading(true);
      try {
        const persistedCards = await WalletRepository.getCards();
        if (isMounted) {
          setCards(persistedCards);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message =
            err instanceof Error
              ? err.message
              : 'Error al inicializar la base de datos de la billetera.';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPersistedCards();

    return () => {
      isMounted = false;
    };
  }, [initialCards]);

  const getCardById = useCallback(
    (id: string): CardPresentationItem | undefined => {
      return cards.find((c) => c.id === id);
    },
    [cards],
  );

  const addCard = useCallback(
    async (input: CreateCardData): Promise<CardPresentationItem> => {
      if (isBusyRef.current) {
        throw new Error('Hay otra operación en curso. Por favor espera un momento.');
      }

      isBusyRef.current = true;
      setLoading(true);
      try {
        const createdCard = await WalletRepository.createCard(input);
        setCards((prev) => [createdCard, ...prev]);
        clearError();
        return createdCard;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Error desconocido al guardar la tarjeta en la base de datos.';
        setError(message);
        throw err;
      } finally {
        isBusyRef.current = false;
        setLoading(false);
      }
    },
    [clearError],
  );

  const updateCard = useCallback(
    async (id: string, input: UpdateCardData): Promise<CardPresentationItem> => {
      if (isBusyRef.current) {
        throw new Error('Hay otra operación en curso. Por favor espera un momento.');
      }

      isBusyRef.current = true;
      setLoading(true);
      try {
        const updatedCard = await WalletRepository.updateCard(id, input);
        setCards((prev) => prev.map((c) => (c.id === id ? updatedCard : c)));
        clearError();
        return updatedCard;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Error desconocido al actualizar la tarjeta.';
        setError(message);
        throw err;
      } finally {
        isBusyRef.current = false;
        setLoading(false);
      }
    },
    [clearError],
  );

  const deleteCard = useCallback(
    async (id: string): Promise<boolean> => {
      if (isBusyRef.current) {
        throw new Error('Hay otra operación en curso. Por favor espera un momento.');
      }

      isBusyRef.current = true;
      setLoading(true);
      try {
        const deleted = await WalletRepository.deleteCard(id);
        if (deleted) {
          setCards((prev) => prev.filter((c) => c.id !== id));
          clearError();
        }
        return deleted;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Error desconocido al eliminar la tarjeta de la base de datos.';
        setError(message);
        throw err;
      } finally {
        isBusyRef.current = false;
        setLoading(false);
      }
    },
    [clearError],
  );

  /**
   * Explicitly populate the persistent database with sample demo cards upon user request.
   * This is never executed silently or automatically on startup.
   */
  const loadSampleCards = useCallback(async (): Promise<void> => {
    if (isBusyRef.current) {
      throw new Error('Hay otra operación en curso.');
    }

    isBusyRef.current = true;
    setLoading(true);
    try {
      for (const sample of MOCK_WALLET_CARDS) {
        await WalletRepository.createCard({
          type: sample.type,
          category: sample.category,
          title: sample.title,
          subtitle: sample.subtitle,
          description: sample.description,
          color: sample.color,
          icon: sample.icon,
          badgeLabel: sample.badgeLabel,
          maskedNumber: sample.maskedNumber,
          issuer: sample.issuer,
          expiresText: sample.expiresText,
          details: sample.details,
        });
      }

      const all = await WalletRepository.getCards();
      setCards(all);
      clearError();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error al importar las tarjetas de demostración.';
      setError(message);
      throw err;
    } finally {
      isBusyRef.current = false;
      setLoading(false);
    }
  }, [clearError]);

  const value = useMemo<WalletContextValue>(
    () => ({
      cards,
      loading,
      error,
      addCard,
      updateCard,
      deleteCard,
      getCardById,
      refreshCards,
      loadSampleCards,
      clearError,
    }),
    [
      cards,
      loading,
      error,
      addCard,
      updateCard,
      deleteCard,
      getCardById,
      refreshCards,
      loadSampleCards,
      clearError,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    // Graceful fallback for standalone tests or previews
    return {
      cards: MOCK_WALLET_CARDS,
      loading: false,
      error: null,
      addCard: async () => MOCK_WALLET_CARDS[0],
      updateCard: async () => MOCK_WALLET_CARDS[0],
      deleteCard: async () => true,
      getCardById: (id) => MOCK_WALLET_CARDS.find((c) => c.id === id),
      refreshCards: async () => {},
      loadSampleCards: async () => {},
      clearError: () => {},
    };
  }
  return context;
}
