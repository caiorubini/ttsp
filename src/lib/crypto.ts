// Criptografia de ponta a ponta (ver docs/SPEC.md, seção 9b).
// Da senha saem duas chaves independentes: uma para entrar no Supabase e outra para cifrar os dados.
// O Supabase só recebe a primeira, e dela não dá para chegar na segunda.

const enc = new TextEncoder()
const dec = new TextDecoder()

export const AUTH_ITERATIONS = 200_000
export const DATA_ITERATIONS = 310_000

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export function toB64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export const normEmail = (email: string) => email.trim().toLowerCase()

export async function deriveSecrets(email: string, passphrase: string, iterations = { auth: AUTH_ITERATIONS, data: DATA_ITERATIONS }) {
  const who = normEmail(email)
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase.normalize('NFC')), 'PBKDF2', false, ['deriveBits', 'deriveKey'])
  const authBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`ttsp/auth/v1/${who}`), iterations: iterations.auth },
    base,
    256,
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`ttsp/data/v1/${who}`), iterations: iterations.data },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  return { authPassword: toHex(authBits), key }
}

export async function seal(key: CryptoKey, value: unknown): Promise<{ iv: string; data: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)))
  return { iv: toB64(iv), data: toB64(new Uint8Array(ct)) }
}

export async function unseal<T = unknown>(key: CryptoKey, iv: string, data: string): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(data))
  return JSON.parse(dec.decode(pt)) as T
}
