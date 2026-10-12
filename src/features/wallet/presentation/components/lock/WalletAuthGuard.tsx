import React, { ReactNode } from 'react';
import { useWalletAuth } from '@/features/wallet/presentation/context/wallet-auth-context';
import { WalletLockScreen } from './WalletLockScreen';

export interface WalletAuthGuardProps {
  children: ReactNode;
}

export const WalletAuthGuard: React.FC<WalletAuthGuardProps> = ({ children }) => {
  const { isLocked } = useWalletAuth();

  if (isLocked) {
    return <WalletLockScreen />;
  }

  return <>{children}</>;
};
