import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { storeWalletFile, readWalletFile, deleteWalletFile } from '@/shared/storage/wallet-files';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB max
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface PickAndEncryptResult {
  cancelled: boolean;
  error?: string;
  fileId?: string;
  previewDataUri?: string;
}

/**
 * Validates image size and MIME type.
 */
export function validateImage(
  fileSize?: number,
  mimeType?: string,
  fileName?: string,
): ImageValidationResult {
  if (fileSize !== undefined && fileSize > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMb = (fileSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `La imagen seleccionada (${sizeInMb} MB) supera el tamaño máximo permitido de 5 MB.`,
    };
  }

  if (mimeType) {
    const normalizedMime = mimeType.toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
      return {
        valid: false,
        error: `Formato de imagen no soportado (${mimeType}). Formatos permitidos: JPG, PNG, WEBP.`,
      };
    }
  } else if (fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension && !['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
      return {
        valid: false,
        error: `Extensión de archivo no soportada (.${extension}). Formatos permitidos: JPG, PNG, WEBP.`,
      };
    }
  }

  return { valid: true };
}
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encodes Uint8Array into a base64 string in pure TypeScript.
 * Safe across all JS engines (Hermes, V8, Node) without external dependencies.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  let i = 0;

  for (; i + 2 < len; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    result +=
      B64_CHARS[b0 >> 2] +
      B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)] +
      B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] +
      B64_CHARS[b2 & 63];
  }

  if (i < len) {
    const b0 = bytes[i];
    if (i + 1 < len) {
      const b1 = bytes[i + 1];
      result +=
        B64_CHARS[b0 >> 2] +
        B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)] +
        B64_CHARS[(b1 & 15) << 2] +
        '=';
    } else {
      result +=
        B64_CHARS[b0 >> 2] +
        B64_CHARS[(b0 & 3) << 4] +
        '==';
    }
  }

  return result;
}

/**
 * Converts Uint8Array bytes to an in-memory base64 Data URI for direct component rendering.
 * Does NOT write any plaintext file to disk.
 */
export function bytesToDataUri(bytes: Uint8Array, mimeType: string = 'image/jpeg'): string {
  const base64 = uint8ArrayToBase64(bytes);
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Launches the native system image picker, validates the picked photo,
 * immediately encrypts it to an authenticated .dwf envelope, cleans up
 * the temporary unencrypted picker file, and returns the opaque fileId and preview URI.
 */
export async function pickAndEncryptImage(): Promise<PickAndEncryptResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { cancelled: true };
    }

    const asset = result.assets[0];

    const validation = validateImage(asset.fileSize, asset.mimeType, asset.fileName ?? undefined);
    if (!validation.valid) {
      return {
        cancelled: false,
        error: validation.error,
      };
    }

    const tempFile = new File(asset.uri);
    if (!tempFile.exists) {
      return {
        cancelled: false,
        error: 'No se pudo acceder al archivo seleccionado.',
      };
    }

    const imageBytes = await tempFile.bytes();

    // Immediately remove temporary unencrypted asset created in cache by picker
    try {
      tempFile.delete();
    } catch {
      // Best-effort cleanup of temporary plaintext file
    }

    let fileId: string;
    let previewDataUri: string;

    try {
      fileId = await storeWalletFile(imageBytes);
      previewDataUri = bytesToDataUri(imageBytes, asset.mimeType || 'image/jpeg');
    } finally {
      // Explicitly wipe the plaintext buffer from memory
      imageBytes.fill(0);
    }

    return {
      cancelled: false,
      fileId,
      previewDataUri,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error al procesar y cifrar la imagen seleccionada.';
    return {
      cancelled: false,
      error: message,
    };
  }
}

/**
 * Reads and decrypts an encrypted wallet file (.dwf) completely in memory,
 * returning a Data URI for React Native Image rendering.
 * Does NOT persist any plaintext file to disk.
 */
export async function loadDecryptedImageDataUri(fileId: string): Promise<string> {
  const bytes = await readWalletFile(fileId);
  try {
    let mimeType = 'image/jpeg';
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      mimeType = 'image/png';
    } else if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      mimeType = 'image/webp';
    }

    return bytesToDataUri(bytes, mimeType);
  } finally {
    bytes.fill(0);
  }
}

/**
 * Safely removes an encrypted image file (.dwf).
 */
export function deleteEncryptedImage(fileId: string): void {
  try {
    deleteWalletFile(fileId);
  } catch {
    // Best-effort cleanup
  }
}
