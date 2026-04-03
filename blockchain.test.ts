import { describe, it, expect } from "vitest";
import {
  isValidWalletAddress,
  getBlockchainName,
  getExplorerUrl,
} from "./blockchain";

describe("Blockchain Service", () => {
  describe("isValidWalletAddress", () => {
    it("should validate Solana addresses", () => {
      const validSolanaAddress = "11111111111111111111111111111111";
      const invalidAddress = "invalid";

      expect(isValidWalletAddress(validSolanaAddress, "solana")).toBe(true);
      expect(isValidWalletAddress(invalidAddress, "solana")).toBe(false);
    });

    it("should reject invalid Ethereum addresses", () => {
      const invalidAddress = "invalid";
      expect(isValidWalletAddress(invalidAddress, "ethereum")).toBe(false);
    });

    it("should reject invalid EVM addresses", () => {
      const invalidAddress = "0xinvalid";
      expect(isValidWalletAddress(invalidAddress, "bsc")).toBe(false);
      expect(isValidWalletAddress(invalidAddress, "polygon")).toBe(false);
    });
  });

  describe("getBlockchainName", () => {
    it("should return correct blockchain names", () => {
      expect(getBlockchainName("solana")).toBe("Solana");
      expect(getBlockchainName("ethereum")).toBe("Ethereum");
      expect(getBlockchainName("bsc")).toBe("Binance Smart Chain");
      expect(getBlockchainName("base")).toBe("Base");
      expect(getBlockchainName("polygon")).toBe("Polygon");
      expect(getBlockchainName("arbitrum")).toBe("Arbitrum");
      expect(getBlockchainName("optimism")).toBe("Optimism");
    });
  });

  describe("getExplorerUrl", () => {
    const txHash = "5sKp4FnrW2q3VzYvVKC6sJCqvjWJGUck287ZWZw72T1u";

    it("should generate correct explorer URLs", () => {
      expect(getExplorerUrl(txHash, "solana")).toContain("solscan.io");
      expect(getExplorerUrl(txHash, "ethereum")).toContain("etherscan.io");
      expect(getExplorerUrl(txHash, "bsc")).toContain("bscscan.com");
      expect(getExplorerUrl(txHash, "base")).toContain("basescan.org");
      expect(getExplorerUrl(txHash, "polygon")).toContain("polygonscan.com");
      expect(getExplorerUrl(txHash, "arbitrum")).toContain("arbiscan.io");
      expect(getExplorerUrl(txHash, "optimism")).toContain("optimistic.etherscan.io");
    });

    it("should include transaction hash in URL", () => {
      const url = getExplorerUrl(txHash, "solana");
      expect(url).toContain(txHash);
    });
  });
});
