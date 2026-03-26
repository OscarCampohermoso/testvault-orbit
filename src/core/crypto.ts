const SALT_LENGTH = 16
const IV_LENGTH = 12
const ITERATIONS = 100000

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(data: string, passphrase: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(passphrase, salt)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )

  const result = new Uint8Array(SALT_LENGTH + IV_LENGTH + encrypted.byteLength)
  result.set(salt, 0)
  result.set(iv, SALT_LENGTH)
  result.set(new Uint8Array(encrypted), SALT_LENGTH + IV_LENGTH)
  return result.buffer
}

export async function decrypt(data: ArrayBuffer, passphrase: string): Promise<string> {
  const bytes = new Uint8Array(data)
  const salt = bytes.slice(0, SALT_LENGTH)
  const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const ciphertext = bytes.slice(SALT_LENGTH + IV_LENGTH)

  const key = await deriveKey(passphrase, salt)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  return new TextDecoder().decode(decrypted)
}
