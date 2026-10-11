jest.mock('expo-secure-store', () => jest.requireActual('./mocks/secure-store').secureStoreMock);
jest.mock('expo-file-system', () => jest.requireActual('./mocks/file-system'));

const mockLaunchImageLibraryAsync = jest.fn();
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));

import { initializeWalletKeys } from '@/shared/security/key-manager';
import {
  validateImage,
  bytesToDataUri,
  uint8ArrayToBase64,
  pickAndEncryptImage,
  loadDecryptedImageDataUri,
  deleteEncryptedImage,
  MAX_IMAGE_SIZE_BYTES,
} from '@/features/wallet/services/image-storage-service';
import * as walletFiles from '@/shared/storage/wallet-files';
import { File } from 'expo-file-system';
import { secureStoreMock } from './mocks/secure-store';
import { fileSystemMock } from './mocks/file-system';

describe('image-storage-service', () => {
  beforeEach(async () => {
    secureStoreMock.reset();
    fileSystemMock.reset();
    mockLaunchImageLibraryAsync.mockReset();
    await initializeWalletKeys();
  });

  describe('validateImage', () => {
    it('accepts valid images within size and format constraints', () => {
      const result = validateImage(1024 * 1024, 'image/jpeg', 'photo.jpg');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects images exceeding 5 MB', () => {
      const result = validateImage(MAX_IMAGE_SIZE_BYTES + 1, 'image/png');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('supera el tamaño máximo');
    });

    it('rejects unsupported MIME types', () => {
      const result = validateImage(1024, 'application/pdf');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Formato de imagen no soportado');
    });

    it('validates file extension when MIME type is absent', () => {
      const validExt = validateImage(1024, undefined, 'document.png');
      expect(validExt.valid).toBe(true);

      const invalidExt = validateImage(1024, undefined, 'document.gif');
      expect(invalidExt.valid).toBe(false);
      expect(invalidExt.error).toContain('Extensión de archivo no soportada');
    });
  });

  describe('uint8ArrayToBase64 and bytesToDataUri', () => {
    it('correctly converts binary bytes to base64 Data URI in memory', () => {
      const rawText = 'Hello DigitalWallet!';
      const bytes = new TextEncoder().encode(rawText);
      const b64 = uint8ArrayToBase64(bytes);
      const dataUri = bytesToDataUri(bytes, 'image/png');

      expect(b64).toBe('SGVsbG8gRGlnaXRhbFdhbGxldCE=');
      expect(dataUri).toBe(`data:image/png;base64,${b64}`);
    });
  });

  describe('loadDecryptedImageDataUri', () => {
    it('decrypts stored .dwf file and detects PNG format signature', async () => {
      // PNG signature: [0x89, 0x50, 0x4e, 0x47, ...]
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
      const fileId = await walletFiles.storeWalletFile(pngBytes);

      const dataUri = await loadDecryptedImageDataUri(fileId);
      expect(dataUri.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('decrypts stored .dwf file and detects WEBP format signature', async () => {
      // RIFF header: [0x52, 0x49, 0x46, 0x46, ...]
      const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
      const fileId = await walletFiles.storeWalletFile(webpBytes);

      const dataUri = await loadDecryptedImageDataUri(fileId);
      expect(dataUri.startsWith('data:image/webp;base64,')).toBe(true);
    });

    it('defaults to image/jpeg for standard JPEG files', async () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);
      const fileId = await walletFiles.storeWalletFile(jpegBytes);

      const dataUri = await loadDecryptedImageDataUri(fileId);
      expect(dataUri.startsWith('data:image/jpeg;base64,')).toBe(true);
    });
  });

  describe('pickAndEncryptImage', () => {
    it('returns cancelled: true when user cancels image picker', async () => {
      mockLaunchImageLibraryAsync.mockResolvedValueOnce({
        canceled: true,
        assets: null,
      });

      const result = await pickAndEncryptImage();
      expect(result.cancelled).toBe(true);
      expect(result.fileId).toBeUndefined();
    });

    it('returns validation error without saving when selected file is too large', async () => {
      mockLaunchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: 'file:///picker-temp/photo.jpg',
            fileSize: MAX_IMAGE_SIZE_BYTES + 500,
            mimeType: 'image/jpeg',
          },
        ],
      });

      const result = await pickAndEncryptImage();
      expect(result.cancelled).toBe(false);
      expect(result.error).toContain('supera el tamaño máximo');
      expect(result.fileId).toBeUndefined();
    });

    it('reads bytes, deletes unencrypted temporary picker file, encrypts to .dwf and returns fileId', async () => {
      const tempUri = 'file:///wallet-cache/picker-photo.jpg';
      const tempFile = new File(tempUri);
      tempFile.create({ intermediates: true, overwrite: true });
      const testBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 10, 20, 30, 40]);
      tempFile.write(testBytes);

      expect(tempFile.exists).toBe(true);

      mockLaunchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: tempUri,
            fileSize: testBytes.length,
            mimeType: 'image/jpeg',
          },
        ],
      });

      const result = await pickAndEncryptImage();
      expect(result.cancelled).toBe(false);
      expect(result.error).toBeUndefined();
      expect(result.fileId).toBeDefined();
      expect(result.previewDataUri).toContain('data:image/jpeg;base64,');

      // Crucial security invariant: the unencrypted temporary picker file is deleted from cache
      expect(tempFile.exists).toBe(false);

      // Verify that the encrypted file can be retrieved and decrypted
      const decrypted = await walletFiles.readWalletFile(result.fileId!);
      expect(decrypted).toEqual(testBytes);
    });

    it('handles unexpected exceptions and returns error message', async () => {
      mockLaunchImageLibraryAsync.mockRejectedValueOnce(new Error('Permission denied'));

      const result = await pickAndEncryptImage();
      expect(result.cancelled).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('deleteEncryptedImage', () => {
    it('safely calls deleteWalletFile', () => {
      const deleteSpy = jest.spyOn(walletFiles, 'deleteWalletFile').mockImplementation(() => {});
      deleteEncryptedImage('some-file-id');
      expect(deleteSpy).toHaveBeenCalledWith('some-file-id');
      deleteSpy.mockRestore();
    });

    it('does not throw even if underlying deleteWalletFile fails', () => {
      const deleteSpy = jest.spyOn(walletFiles, 'deleteWalletFile').mockImplementation(() => {
        throw new Error('File not found');
      });
      expect(() => deleteEncryptedImage('non-existent')).not.toThrow();
      deleteSpy.mockRestore();
    });
  });
});
