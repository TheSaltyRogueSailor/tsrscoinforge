import { describe, it, expect } from "vitest";
import {
  generateWallet,
  encryptWallet,
  decryptWallet,
  isValidSeedPhrase,
  importWalletFromSeedPhrase,
  validatePasswordStrength,
} from "./wallet";

describe("Wallet System", () => {
  describe("Wallet Generation", () => {
    it("should generate a valid wallet with seed phrase", () => {
      const wallet = generateWallet();
      expect(wallet).toHaveProperty("mnemonic");
      expect(wallet).toHaveProperty("publicKey");
      expect(wallet).toHaveProperty("secretKey");
      expect(wallet.mnemonic.split(" ").length).toBe(12);
    });

    it("should generate unique wallets", () => {
      const wallet1 = generateWallet();
      const wallet2 = generateWallet();
      expect(wallet1.mnemonic).not.toBe(wallet2.mnemonic);
      expect(wallet1.publicKey).not.toBe(wallet2.publicKey);
    });

    it("should have valid base64 encoded secret key", () => {
      const wallet = generateWallet();
      expect(() => Buffer.from(wallet.secretKey, "base64")).not.toThrow();
    });
  });

  describe("Seed Phrase Validation", () => {
    it("should validate correct seed phrases", () => {
      const wallet = generateWallet();
      expect(isValidSeedPhrase(wallet.mnemonic)).toBe(true);
    });

    it("should reject invalid seed phrases", () => {
      expect(isValidSeedPhrase("invalid seed phrase")).toBe(false);
      expect(isValidSeedPhrase("")).toBe(false);
      expect(isValidSeedPhrase("word")).toBe(false);
    });
  });

  describe("Wallet Import", () => {
    it("should import wallet from valid seed phrase", () => {
      const originalWallet = generateWallet();
      const importedWallet = importWalletFromSeedPhrase(originalWallet.mnemonic);

      expect(importedWallet.publicKey).toBe(originalWallet.publicKey);
      expect(importedWallet.secretKey).toBe(originalWallet.secretKey);
    });

    it("should throw on invalid seed phrase import", () => {
      expect(() => importWalletFromSeedPhrase("invalid phrase")).toThrow();
    });
  });

  describe("Wallet Encryption", () => {
    it("should encrypt and decrypt wallet data", () => {
      const wallet = generateWallet();
      const walletData = JSON.stringify(wallet);
      const password = "SecurePassword123!";

      const encrypted = encryptWallet(walletData, password);
      expect(encrypted).not.toBe(walletData);
      expect(encrypted).toContain(":");

      const decrypted = decryptWallet(encrypted, password);
      expect(decrypted).toBe(walletData);
    });

    it("should fail with wrong password", () => {
      const wallet = generateWallet();
      const walletData = JSON.stringify(wallet);
      const password = "SecurePassword123!";

      const encrypted = encryptWallet(walletData, password);
      expect(() => decryptWallet(encrypted, "WrongPassword")).toThrow();
    });

    it("should handle special characters in password", () => {
      const wallet = generateWallet();
      const walletData = JSON.stringify(wallet);
      const password = "P@ssw0rd!#$%^&*()";

      const encrypted = encryptWallet(walletData, password);
      const decrypted = decryptWallet(encrypted, password);
      expect(decrypted).toBe(walletData);
    });
  });

  describe("Password Strength Validation", () => {
    it("should validate strong passwords", () => {
      const result = validatePasswordStrength("SecurePass123!");
      expect(result.isStrong).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(4);
    });

    it("should reject weak passwords", () => {
      const result = validatePasswordStrength("weak");
      expect(result.isStrong).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it("should provide feedback for missing requirements", () => {
      const result = validatePasswordStrength("password");
      expect(result.feedback).toContain("Add uppercase letters");
      expect(result.feedback).toContain("Add numbers");
      expect(result.feedback).toContain("Add special characters");
    });

    it("should score password strength correctly", () => {
      const weak = validatePasswordStrength("pass");
      const medium = validatePasswordStrength("Password123");
      const strong = validatePasswordStrength("SecurePass123!");

      expect(weak.score).toBeLessThan(medium.score);
      expect(medium.score).toBeLessThan(strong.score);
    });

    it("should accept 8+ character passwords", () => {
      const result = validatePasswordStrength("Password1");
      expect(result.feedback).not.toContain(
        "Password should be at least 8 characters"
      );
    });
  });

  describe("Wallet Data Integrity", () => {
    it("should preserve wallet data through encryption cycle", () => {
      const wallet = generateWallet();
      const password = "TestPassword123!";

      const encrypted = encryptWallet(JSON.stringify(wallet), password);
      const decrypted = JSON.parse(
        decryptWallet(encrypted, password)
      );

      expect(decrypted.publicKey).toBe(wallet.publicKey);
      expect(decrypted.secretKey).toBe(wallet.secretKey);
      expect(decrypted.mnemonic).toBe(wallet.mnemonic);
    });

    it("should handle multiple encryption cycles", () => {
      const wallet = generateWallet();
      const password = "TestPassword123!";
      let data = JSON.stringify(wallet);

      for (let i = 0; i < 3; i++) {
        data = decryptWallet(encryptWallet(data, password), password);
      }

      const finalWallet = JSON.parse(data);
      expect(finalWallet.publicKey).toBe(wallet.publicKey);
    });
  });
});
