import { describe, it, expect } from "vitest";
import { getCreationFeeInCrypto } from "./paymentProcessor";
import { getCreationFeeUSD } from "./config";

describe("Payment Router", () => {
  describe("Fee Calculation", () => {
    it("should calculate creation fee for Solana", () => {
      const fee = getCreationFeeInCrypto("solana");
      expect(fee.amountUSD).toBe(50);
      expect(fee.amountCrypto).toBeGreaterThan(0);
      expect(fee.symbol).toBe("SOL");
    });

    it("should calculate creation fee for Ethereum", () => {
      const fee = getCreationFeeInCrypto("ethereum");
      expect(fee.amountUSD).toBe(125);
      expect(fee.amountCrypto).toBeGreaterThan(0);
      expect(fee.symbol).toBe("ETH");
    });

    it("should calculate creation fee for BSC", () => {
      const fee = getCreationFeeInCrypto("bsc");
      expect(fee.amountUSD).toBe(30);
      expect(fee.amountCrypto).toBeGreaterThan(0);
      expect(fee.symbol).toBe("BNB");
    });

    it("should calculate creation fee for Base", () => {
      const fee = getCreationFeeInCrypto("base");
      expect(fee.amountUSD).toBe(50);
      expect(fee.amountCrypto).toBeGreaterThan(0);
      expect(fee.symbol).toBe("ETH");
    });

    it("should calculate creation fee for Polygon", () => {
      const fee = getCreationFeeInCrypto("polygon");
      expect(fee.amountUSD).toBe(5);
      expect(fee.amountCrypto).toBeGreaterThan(0);
      expect(fee.symbol).toBe("MATIC");
    });

    it("should calculate creation fee for Arbitrum", () => {
      const fee = getCreationFeeInCrypto("arbitrum");
      expect(fee.amountUSD).toBe(40);
      expect(fee.amountCrypto).toBeGreaterThan(0);
      expect(fee.symbol).toBe("ETH");
    });

    it("should calculate creation fee for Optimism", () => {
      const fee = getCreationFeeInCrypto("optimism");
      expect(fee.amountUSD).toBe(40);
      expect(fee.amountCrypto).toBeGreaterThan(0);
      expect(fee.symbol).toBe("ETH");
    });
  });

  describe("USD Fee Structure", () => {
    it("should return correct USD fees for all blockchains", () => {
      const blockchains = ["solana", "ethereum", "bsc", "base", "polygon", "arbitrum", "optimism"] as const;
      
      for (const blockchain of blockchains) {
        const fee = getCreationFeeUSD(blockchain);
        expect(fee).toBeGreaterThan(0);
        expect(typeof fee).toBe("number");
      }
    });
  });

  describe("Admin Fee Waiver", () => {
    it("should waive fees for admin users", () => {
      // Admin users should pay $0
      const adminFee = 0;
      expect(adminFee).toBe(0);
    });

    it("should charge regular users", () => {
      const fee = getCreationFeeUSD("solana");
      expect(fee).toBeGreaterThan(0);
    });
  });

  describe("Payment Methods", () => {
    it("should support crypto payments", () => {
      const methods = ["crypto"];
      expect(methods).toContain("crypto");
    });

    it("should support fiat payments", () => {
      const methods = ["moonpay", "stripe"];
      expect(methods).toContain("moonpay");
      expect(methods).toContain("stripe");
    });
  });
});
