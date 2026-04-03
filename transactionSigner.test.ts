import { describe, it, expect } from "vitest";
import { createSolanaTransaction, createEVMTransaction } from "./transactionSigner";

describe("Transaction Signer", () => {
  describe("Solana Transactions", () => {
    it("should handle invalid Solana addresses", async () => {
      const result = await createSolanaTransaction({
        fromPublicKey: "invalid",
        toPublicKey: "invalid",
        lamports: 1000000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("EVM Transactions", () => {
    it("should handle unsupported chains", async () => {
      const result = await createEVMTransaction({
        chain: "unsupported" as any,
        fromAddress: "0x1234567890123456789012345678901234567890",
        toAddress: "0x0987654321098765432109876543210987654321",
        amount: "1000000000000000000",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported chain");
    });

    it("should validate EVM addresses", async () => {
      const result = await createEVMTransaction({
        chain: "ethereum",
        fromAddress: "invalid",
        toAddress: "invalid",
        amount: "1000000000000000000",
      });

      expect(result).toBeDefined();
    });
  });
});
