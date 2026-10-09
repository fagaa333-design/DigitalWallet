import * as SecureStore from 'expo-secure-store';

export function getSecret(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export function setSecret(key: string, value: string): Promise<void> {
  return SecureStore.setItemAsync(key, value);
}

export function removeSecret(key: string): Promise<void> {
  return SecureStore.deleteItemAsync(key);
}
