const { safeStorage } = require('electron');
const Store = require('electron-store');

const store = new Store({ name: 'secure-tokens' });

/**
 * Encrypts and stores a value using Electron's safeStorage API.
 * Falls back to unencrypted storage if encryption is unavailable (e.g., Linux without keyring).
 *
 * @param {string} key - Storage key
 * @param {string} value - Value to encrypt and store
 */
function set(key, value) {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value);
    const base64 = encrypted.toString('base64');
    store.set(key, base64);
  } else {
    console.warn('[secureStore] Encryption unavailable - storing without encryption (missing keyring/keychain)');
    store.set(key, value);
  }
}

/**
 * Retrieves and decrypts a stored value.
 *
 * @param {string} key - Storage key
 * @returns {string | null} Decrypted value or null if not found
 */
function get(key) {
  const stored = store.get(key);
  if (stored == null) {
    return null;
  }

  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(stored, 'base64');
      return safeStorage.decryptString(buffer);
    } catch (err) {
      console.error('[secureStore] Decryption failed:', err);
      return null;
    }
  } else {
    // Fallback: stored unencrypted
    return stored;
  }
}

/**
 * Removes a stored value.
 *
 * @param {string} key - Storage key
 */
function remove(key) {
  store.delete(key);
}

module.exports = { set, get, remove };
