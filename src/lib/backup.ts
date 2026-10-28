/**
 * Optional passphrase-encrypted backups.
 *
 * Workboard stores everything locally, so an encrypted export is the safest way
 * to move data between devices or keep an off-machine copy. The envelope is
 * plain JSON; the payload is AES-GCM ciphertext derived from the passphrase
 * with PBKDF2-SHA256. Nothing here talks to the network.
 */

export const ENCRYPTED_BACKUP_FORMAT = 'workboard-encrypted-backup';
export const ENCRYPTED_BACKUP_VERSION = 1;
export const MIN_PASSPHRASE_LENGTH = 8;

/** OWASP-recommended floor for PBKDF2-HMAC-SHA256 (2023 guidance). */
const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;

export interface EncryptedBackupEnvelope {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  version: number;
  createdAt: string;
  kdf: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string;
  };
  cipher: {
    name: 'AES-GCM';
    iv: string;
  };
  /** Base64-encoded ciphertext (includes the GCM authentication tag). */
  payload: string;
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const requireSubtle = (): SubtleCrypto => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Encrypted backups are not supported in this browser.');
  }
  return subtle;
};

/** Narrow `Uint8Array` to the DOM's `BufferSource` (TS lib generics differ). */
const asBufferSource = (bytes: Uint8Array): BufferSource => bytes as unknown as BufferSource;

const deriveKey = async (
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> => {
  const keyMaterial = await requireSubtle().importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return requireSubtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: asBufferSource(salt), iterations },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
};

/** Returns a human-readable problem with a passphrase, or null when it is valid. */
export const validatePassphrase = (passphrase: string): string | null => {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    return `Use at least ${MIN_PASSPHRASE_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(passphrase) || !/[0-9]/.test(passphrase)) {
    return 'Include at least one letter and one number.';
  }
  return null;
};

export const encryptBackup = async (
  data: unknown,
  passphrase: string
): Promise<EncryptedBackupEnvelope> => {
  const problem = validatePassphrase(passphrase);
  if (problem) throw new Error(problem);

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await requireSubtle().encrypt(
    { name: 'AES-GCM', iv: asBufferSource(iv) },
    key,
    plaintext
  );

  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: PBKDF2_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: 'AES-GCM',
      iv: bytesToBase64(iv),
    },
    payload: bytesToBase64(new Uint8Array(ciphertext)),
  };
};

export const isEncryptedBackup = (value: unknown): value is EncryptedBackupEnvelope => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.format !== ENCRYPTED_BACKUP_FORMAT) return false;
  if (typeof candidate.payload !== 'string' || candidate.payload.length === 0) return false;

  const kdf = candidate.kdf;
  const cipher = candidate.cipher;
  if (!kdf || typeof kdf !== 'object' || !cipher || typeof cipher !== 'object') return false;
  const kdfRecord = kdf as Record<string, unknown>;
  const cipherRecord = cipher as Record<string, unknown>;

  return (
    kdfRecord.name === 'PBKDF2' &&
    kdfRecord.hash === 'SHA-256' &&
    typeof kdfRecord.iterations === 'number' &&
    typeof kdfRecord.salt === 'string' &&
    cipherRecord.name === 'AES-GCM' &&
    typeof cipherRecord.iv === 'string'
  );
};

export const decryptBackup = async (
  envelope: EncryptedBackupEnvelope,
  passphrase: string
): Promise<unknown> => {
  if (!isEncryptedBackup(envelope)) {
    throw new Error('This file is not a Workboard encrypted backup.');
  }

  try {
    const key = await deriveKey(
      passphrase,
      base64ToBytes(envelope.kdf.salt),
      envelope.kdf.iterations
    );
    const plaintext = await requireSubtle().decrypt(
      {
        name: 'AES-GCM',
        iv: asBufferSource(base64ToBytes(envelope.cipher.iv)),
      },
      key,
      asBufferSource(base64ToBytes(envelope.payload))
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error('Incorrect passphrase or corrupted backup file.');
  }
};
