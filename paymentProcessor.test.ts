import { describe, it, expect } from "vitest";
import {
  getCreationFeeInCrypto,
  calculateTotalCost,
  formatPaymentDisplay,
} from "./paymentProcessor";

describe("Payment Processor", () => {
  describe("getCreationFeeInCrypto", () => {
    it("should calculate Solana creation fee", () => {
      const fee = getCreationFeeInCrypto("solana");
      expect(fee.amountUSD).toBe(50);
      expect(fee.symbol).toBe("SOL");
      expect(fee.amountCrypto).toBeGreaterThan(0);
    });

    it("should calculate Ethereum creation fee", () => {
      const fee = getCreationFeeInCrypto("ethereum");
      expect(fee.amountUSD).toBe(125);
      expect(fee.symbol).toBe("ETH");
      expect(fee.amountCrypto).toBeGreaterThan(0);
    });

    it("should calculate BSC creation fee", () => {
      const fee = getCreationFeeInCrypto("bsc");
      expect(fee.amountUSD).toBe(30);
      expect(fee.symbol).toBe("BNB");
      expect(fee.amountCrypto).toBeGreaterThan(0);
    });

    it("should calculate Base creation fee", () => {
      const fee = getCreationFeeInCrypto("base");
      expect(fee.amountUSD).toBe(50);
      expect(fee.symbol).toBe("ETH");
      expect(fee.amountCrypto).toBeGreaterThan(0);
    });

    it("should calculate Polygon creation fee", () => {
      const fee = getCreationFeeInCrypto("polygon");
      expect(fee.amountUSD).toBe(5);
      expect(fee.symbol).toBe("MATIC");
      expect(fee.amountCrypto).toBeGreaterThan(0);
    });

    it("should calculate Arbitrum creation fee", () => {
      const fee = getCreationFeeInCrypto("arbitrum");
      expect(fee.amountUSD).toBe(40);
      expect(fee.symbol).toBe("ETH");
      expect(fee.amountCrypto).toBeGreaterThan(0);
    });

    it("should calculate Optimism creation fee", () => {
      const fee = getCreationFeeInCrypto("optimism");
      expect(fee.amountUSD).toBe(40);
      expect(fee.symbol).toBe("ETH");
      expect(fee.amountCrypto).toBeGreaterThan(0);
    });
  });

  describe("calculateTotalCost", () => {
    it("should include creation fee and gas fee", () => {
      const cost = calculateTotalCost({ blockchain: "solana" });
      expect(cost.creationFeeUSD).toBe(50);
      expect(cost.gasFeeUSD).toBeGreaterThan(0);
      expect(cost.totalUSD).toBeGreaterThan(cost.creationFeeUSD);
    });

    it("should use custom gas estimate if provided", () => {
      const cost = calculateTotalCost({
        blockchain: "ethereum",
        gasEstimate: 10,
      });
      expect(cost.creationFeeUSD).toBe(125);
      expect(cost.gasFeeUSD).toBe(10);
      expect(cost.totalUSD).toBe(135);
    });
  });

  describe("formatPaymentDisplay", () => {
    it("should format payment display correctly", () => {
      const formatted = formatPaymentDisplay({
        amountCrypto: 0.05,
        symbol: "SOL",
        amountUSD: 50,
      });
      expect(formatted).toContain("SOL");
      expect(formatted).toContain("$50.00");
    });

    it("should format ETH payment correctly", () => {
      const formatted = formatPaymentDisplay({
        amountCrypto: 0.0625,
        symbol: "ETH",
        amountUSD: 125,
      });
      expect(formatted).toContain("ETH");
      expect(formatted).toContain("$125.00");
    });
  });
});
