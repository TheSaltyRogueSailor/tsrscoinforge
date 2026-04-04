import CryptoJS from "crypto-js";

export interface StoredWallet {
  publicKey: string;
  mnemonic: string;
}

/**
 * Encrypt and store wallet data in localStorage
 */
export function storeWallet(wallet: StoredWallet, password: string): void {
  const encryptedData = CryptoJS.AES.encrypt(
    JSON.stringify(wallet),
    password
  ).toString();

  localStorage.setItem(`wallet_${wallet.publicKey}`, encryptedData);
}

/**
 * Retrieve and decrypt wallet from localStorage
 */
export function retrieveWallet(publicKey: string, password: string): StoredWallet | null {
  const encryptedData = localStorage.getItem(`wallet_${publicKey}`);

  if (!encryptedData) {
    return null;
  }

  try {
    const decryptedData = CryptoJS.AES.decrypt(encryptedData, password).toString(
      CryptoJS.enc.Utf8
    );
    return JSON.parse(decryptedData);
  } catch (error) {
    throw new Error("Invalid password or corrupted wallet data");
  }
}

/**
 * List all stored wallet public keys
 */
export function listStoredWallets(): string[] {
  const wallets: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("wallet_")) {
      wallets.push(key.replace("wallet_", ""));
    }
  }

  return wallets;
}

/**
 * Delete wallet from localStorage
 */
export function deleteWallet(publicKey: string): void {
  localStorage.removeItem(`wallet_${publicKey}`);
}

/**
 * Check if wallet exists in localStorage
 */
export function walletExists(publicKey: string): boolean {
  return localStorage.getItem(`wallet_${publicKey}`) !== null;
}

/**
 * Export wallet backup (encrypted)
 */
export function exportWalletBackup(publicKey: string): string | null {
  const encryptedData = localStorage.getItem(`wallet_${publicKey}`);
  return encryptedData;
}

/**
 * Import wallet backup
 */
export function importWalletBackup(publicKey: string, encryptedData: string): void {
  localStorage.setItem(`wallet_${publicKey}`, encryptedData);
}

/**
 * Clear all wallets from localStorage (use with caution!)
 */
export function clearAllWallets(): void {
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("wallet_")) {
      keys.push(key);
    }
  }

  keys.forEach((key) => localStorage.removeItem(key));
}
