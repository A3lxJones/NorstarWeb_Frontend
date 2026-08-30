/**
 * Application-layer encryption for personal data (GDPR Art. 32).
 *
 * Emails and phone numbers are encrypted with AES-256-GCM *before* they reach
 * Postgres and decrypted on the way out, so a database dump, a leaked backup or
 * a compromised service-role key never yields readable contact details — the
 * key lives only in the server process environment, never in the database.
 *
 * Ciphertext is stored as `enc:v1:<base64url(iv | authTag | ciphertext)>`.
 * The prefix makes ciphertext self-identifying, which means:
 *   - `decryptField` passes legacy plaintext through untouched, so the app keeps
 *     working before and during the backfill (see scripts/encrypt-existing-pii.ts);
 *   - `decryptDeep` can walk an arbitrary API response and decrypt every field
 *     without needing to know the schema (nested Supabase embeds included).
 *
 * GCM authenticates as well as encrypts: tampering with a stored value causes
 * decryption to fail rather than silently returning corrupted data.
 */

import crypto from "crypto";

const PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

let cachedKey: Buffer | undefined;

/**
 * Resolves the master key from PII_ENCRYPTION_KEY. Accepts a 64-char hex or a
 * base64 string, both decoding to exactly 32 bytes. Resolved lazily (not at
 * import time) so read-only paths over legacy plaintext still work if the key
 * has not been provisioned yet.
 */
function getKey(): Buffer {
    if (cachedKey) {
        return cachedKey;
    }

    const raw = process.env.PII_ENCRYPTION_KEY?.trim();
    if (!raw) {
        throw new Error(
            "PII_ENCRYPTION_KEY is not set. Personal data (email, phone) cannot be " +
            "encrypted or decrypted without it. Generate one with: " +
            'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
        );
    }

    const key = /^[0-9a-fA-F]{64}$/.test(raw)
        ? Buffer.from(raw, "hex")
        : Buffer.from(raw, "base64");

    if (key.length !== KEY_BYTES) {
        throw new Error(
            `PII_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). ` +
            "Provide 64 hex characters or a base64-encoded 32-byte key."
        );
    }

    cachedKey = key;
    return key;
}

/** True if the value is already ciphertext produced by `encryptField`. */
export function isEncrypted(value: unknown): value is string {
    return typeof value === "string" && value.startsWith(PREFIX);
}

/**
 * Encrypts a personal-data value for storage. Null/undefined/empty values pass
 * through unchanged so optional columns stay NULL rather than storing ciphertext
 * of an empty string. Already-encrypted input is returned as-is, making callers
 * idempotent (the backfill script relies on this).
 */
export function encryptField<T extends string | null | undefined>(value: T): T {
    if (value === null || value === undefined || value === "") {
        return value;
    }
    if (isEncrypted(value)) {
        return value;
    }

    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return (PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64url")) as T;
}

/**
 * Decrypts a stored value. Values without the ciphertext prefix are returned
 * untouched (legacy plaintext rows, and non-PII strings passing through the
 * response walker).
 */
export function decryptField<T extends string | null | undefined>(value: T): T {
    if (!isEncrypted(value)) {
        return value;
    }

    const payload = Buffer.from(value.slice(PREFIX.length), "base64url");
    if (payload.length <= IV_BYTES + TAG_BYTES) {
        throw new Error("Encrypted value is malformed: payload too short.");
    }

    const iv = payload.subarray(0, IV_BYTES);
    const tag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = payload.subarray(IV_BYTES + TAG_BYTES);

    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);

    return (decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8")) as T;
}

/**
 * Recursively decrypts every ciphertext string in a JSON-shaped value, leaving
 * everything else untouched. Applied to outgoing API responses so nested
 * Supabase embeds (`coach:profiles(...)`, `parent:profiles(...)`, …) are covered
 * without every call site having to remember.
 *
 * A decryption failure yields null rather than throwing, so one bad row cannot
 * take down a whole listing page — and it never leaks the raw ciphertext.
 */
export function decryptDeep<T>(value: T, depth = 0): T {
    if (depth > 12) {
        return value;
    }

    if (isEncrypted(value)) {
        try {
            return decryptField(value) as T;
        } catch {
            console.error("Failed to decrypt a stored personal-data field.");
            return null as T;
        }
    }

    if (Array.isArray(value)) {
        return value.map((item) => decryptDeep(item, depth + 1)) as T;
    }

    if (value !== null && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            out[key] = decryptDeep(item, depth + 1);
        }
        return out as T;
    }

    return value;
}
