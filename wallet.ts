import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import crypto from "crypto";

/**
 * Generate a new Solana wallet with seed phrase
 */
export const generateWallet = () => {
  // Generate 12-word seed phrase
  const mnemonic = bip39.generateMnemonic(128);

  // Derive keypair from seed phrase
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const keypair = Keypair.fromSeed(seed.slice(0, 32));

  return {
    mnemonic,
    publicKey: keypair.publicKey.toString(),
    secretKey: Buffer.from(keypair.secretKey).toString("base64"),
  };
};

/**
 * Encrypt wallet data for storage
 */
export const encryptWallet = (walletData: string, password: string): string => {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(walletData, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};

/**
 * Decrypt wallet data from storage
 */
export const decryptWallet = (encryptedData: string, password: string): string => {
  const [ivHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const key = crypto.scryptSync(password, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

/**
 * Validate seed phrase format
 */
export const isValidSeedPhrase = (mnemonic: string): boolean => {
  return bip39.validateMnemonic(mnemonic);
};

/**
 * Import wallet from seed phrase
 */
export const importWalletFromSeedPhrase = (mnemonic: string) => {
  if (!isValidSeedPhrase(mnemonic)) {
    throw new Error("Invalid seed phrase");
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const keypair = Keypair.fromSeed(seed.slice(0, 32));

  return {
    publicKey: keypair.publicKey.toString(),
    secretKey: Buffer.from(keypair.secretKey).toString("base64"),
  };
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): {
  isStrong: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push("Password should be at least 8 characters");

  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score++;
  else feedback.push("Add uppercase letters");

  if (/[0-9]/.test(password)) score++;
  else feedback.push("Add numbers");

  if (/[!@#$%^&*]/.test(password)) score++;
  else feedback.push("Add special characters");

  return {
    isStrong: score >= 4,
    score,
    feedback,
  };
};

export default {
  generateWallet,
  encryptWallet,
  decryptWallet,
  isValidSeedPhrase,
  importWalletFromSeedPhrase,
  validatePasswordStrength,
};
