// ─────────────────────────────────────────────────────────────────────────────
// lib/encryption.js — AES-256-GCM encrypt/decrypt for user AI keys
//
// Uses Node.js built-in `crypto`. No third-party dependency needed.
// The secret is derived from APP_SECRET in .env (must be set in production).
// ─────────────────────────────────────────────────────────────────────────────

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

/**
 * Derives a 32-byte encryption key from APP_SECRET using scrypt.
 * Deterministic — same secret always produces the same key.
 */
function getDerivedKey() {
  const secret = process.env.APP_SECRET
  if (!secret) throw new Error('APP_SECRET is not set in environment variables')
  // Static salt is fine here — we're not storing passwords, just deriving a key
  return scryptSync(secret, 'tokenflow-ai-key-salt', 32)
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format (base64): [12-byte IV][16-byte auth tag][ciphertext]
 *
 * @param {string} plaintext
 * @returns {string} base64-encoded encrypted blob
 */
export function encrypt(plaintext: string): string {
  const key = getDerivedKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Pack: IV (12) + authTag (16) + ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * Decrypts a base64-encoded blob produced by `encrypt`.
 *
 * @param {string} encryptedData - base64 string
 * @returns {string} original plaintext
 */
export function decrypt(encryptedData: string): string {
  const key = getDerivedKey()
  const buf = Buffer.from(encryptedData, 'base64')

  const iv      = buf.subarray(0, 12)
  const authTag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8')
}
