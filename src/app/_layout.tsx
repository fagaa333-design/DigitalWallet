import { Stack } from 'expo-router';
import { WalletProvider } from '@/features/wallet/presentation/context/wallet-context';

export default function RootLayout() {
  return (
    <WalletProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </WalletProvider>
  );
}
