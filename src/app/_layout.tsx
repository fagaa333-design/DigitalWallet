import { Stack } from 'expo-router';
import { WalletAuthProvider } from '@/features/wallet/presentation/context/wallet-auth-context';
import { WalletProvider } from '@/features/wallet/presentation/context/wallet-context';
import { WalletAuthGuard } from '@/features/wallet/presentation/components/lock';

export default function RootLayout() {
  return (
    <WalletAuthProvider>
      <WalletAuthGuard>
        <WalletProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </WalletProvider>
      </WalletAuthGuard>
    </WalletAuthProvider>
  );
}
