import { webcrypto } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { EncryptedBackupEnvelope } from '../backup';
import {
  decryptBackup,
  encryptBackup,
  ENCRYPTED_BACKUP_FORMAT,
  isEncryptedBackup,
  MIN_PASSPHRASE_LENGTH,
  validatePassphrase,
} from '../backup';

const PASSPHRASE = 'correct horse 42';
const PAYLOAD = {
  version: 1,
  projects: [{ id: 'p1', name: 'Portfolio' }],
  tasks: [{ id: 't1', title: 'Ship it', dueDate: '2026-11-01' }],
};

beforeAll(() => {
  // The global test setup only stubs randomUUID; encrypted backups need SubtleCrypto.
  vi.stubGlobal('crypto', webcrypto);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('validatePassphrase', () => {
  it('requires the minimum length', () => {
    expect(validatePassphrase('a'.repeat(MIN_PASSPHRASE_LENGTH - 1))).toMatch(/at least/i);
  });

  it('requires a letter and a number', () => {
    expect(validatePassphrase('onlyletters')).toMatch(/letter and one number/i);
    expect(validatePassphrase('12345678')).toMatch(/letter and one number/i);
  });

  it('accepts a strong passphrase', () => {
    expect(validatePassphrase(PASSPHRASE)).toBeNull();
  });
});

describe('encryptBackup', () => {
  it('produces a versioned AES-GCM envelope', async () => {
    const envelope = await encryptBackup(PAYLOAD, PASSPHRASE);

    expect(envelope.format).toBe(ENCRYPTED_BACKUP_FORMAT);
    expect(envelope.version).toBe(1);
    expect(envelope.kdf.name).toBe('PBKDF2');
    expect(envelope.kdf.hash).toBe('SHA-256');
    expect(envelope.kdf.iterations).toBeGreaterThanOrEqual(100_000);
    expect(envelope.cipher.name).toBe('AES-GCM');
    expect(envelope.payload.length).toBeGreaterThan(0);
    expect(() => new Date(envelope.createdAt)).not.toThrow();
  });

  it('never stores the plaintext payload', async () => {
    const envelope = await encryptBackup(PAYLOAD, PASSPHRASE);

    expect(JSON.stringify(envelope)).not.toContain('Portfolio');
    expect(JSON.stringify(envelope)).not.toContain('Ship it');
  });

  it('uses a fresh salt and IV for every backup', async () => {
    const first = await encryptBackup(PAYLOAD, PASSPHRASE);
    const second = await encryptBackup(PAYLOAD, PASSPHRASE);

    expect(first.kdf.salt).not.toBe(second.kdf.salt);
    expect(first.cipher.iv).not.toBe(second.cipher.iv);
    expect(first.payload).not.toBe(second.payload);
  });

  it('rejects weak passphrases', async () => {
    await expect(encryptBackup(PAYLOAD, 'short')).rejects.toThrow(/at least/i);
  });
});

describe('decryptBackup', () => {
  it('round-trips the exported data', async () => {
    const envelope = await encryptBackup(PAYLOAD, PASSPHRASE);
    const decrypted = await decryptBackup(envelope, PASSPHRASE);

    expect(decrypted).toEqual(PAYLOAD);
  });

  it('fails with the wrong passphrase', async () => {
    const envelope = await encryptBackup(PAYLOAD, PASSPHRASE);

    await expect(decryptBackup(envelope, 'wrong passphrase 1')).rejects.toThrow(
      /Incorrect passphrase or corrupted backup/i
    );
  });

  it('fails when the ciphertext is tampered with', async () => {
    const envelope = await encryptBackup(PAYLOAD, PASSPHRASE);
    const tampered = {
      ...envelope,
      payload: `${envelope.payload.slice(0, -4)}AAAA`,
    };

    await expect(decryptBackup(tampered, PASSPHRASE)).rejects.toThrow(
      /Incorrect passphrase or corrupted backup/i
    );
  });

  it('rejects files that are not encrypted backups', async () => {
    const invalid = {
      format: 'something-else',
      payload: 'x',
    } as unknown as EncryptedBackupEnvelope;

    await expect(decryptBackup(invalid, PASSPHRASE)).rejects.toThrow(
      /not a Workboard encrypted backup/i
    );
  });
});

describe('isEncryptedBackup', () => {
  it('accepts a generated envelope', async () => {
    const envelope = await encryptBackup(PAYLOAD, PASSPHRASE);
    expect(isEncryptedBackup(envelope)).toBe(true);
  });

  it('rejects plain exports, envelopes without payload and malformed metadata', async () => {
    const envelope = await encryptBackup(PAYLOAD, PASSPHRASE);

    expect(isEncryptedBackup(PAYLOAD)).toBe(false);
    expect(isEncryptedBackup(null)).toBe(false);
    expect(isEncryptedBackup({ ...envelope, payload: '' })).toBe(false);
    expect(isEncryptedBackup({ ...envelope, kdf: { ...envelope.kdf, iterations: 'many' } })).toBe(
      false
    );
    expect(isEncryptedBackup({ ...envelope, cipher: undefined })).toBe(false);
    expect(isEncryptedBackup({ ...envelope, cipher: { name: 'AES-CBC', iv: 'x' } })).toBe(false);
  });
});
