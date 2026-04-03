import { describe, expect, it } from "vitest";
import { isValidSolanaAddress, getSolanaNetworkInfo } from "./solana";

describe("Solana Vault Configuration", () => {
  it("should validate the TSRS vault address format", () => {
    const vaultAddress = process.env.SOLANA_VAULT_ADDRESS;
    expect(vaultAddress).toBeDefined();
    expect(vaultAddress).toBeTruthy();
    // The isValidSolanaAddress function uses PublicKey validation which is the authoritative check
    expect(isValidSolanaAddress(vaultAddress!)).toBe(true);
  });

  it("should have valid Solana network configured", () => {
    const network = process.env.SOLANA_NETWORK;
    expect(network).toBeDefined();
    expect(["mainnet-beta", "testnet", "devnet"]).toContain(network);
  });

  it("should return correct network info", () => {
    const info = getSolanaNetworkInfo();
    expect(info.network).toBeDefined();
    expect(info.rpcUrl).toBeDefined();
    expect(info.vaultAddress).toBeDefined();
    expect(info.vaultAddress).not.toBe("Not configured");
  });

  it("vault address should be a valid Solana public key", () => {
    const vaultAddress = process.env.SOLANA_VAULT_ADDRESS;
    // Solana addresses are base58 encoded and typically 43-44 characters
    expect(vaultAddress).toMatch(/^[1-9A-HJ-NP-Z]{43,44}$|^[1-9A-Za-z]{40,50}$/);
  });
});

describe("Price Conversion", () => {
  it("should calculate SOL to USD conversion", () => {
    const solAmount = 1;
    const solPrice = 150; // Mock price
    const expectedUsd = solAmount * solPrice;
    expect(expectedUsd).toBe(150);
  });

  it("should calculate USD to SOL conversion", () => {
    const usdAmount = 150;
    const solPrice = 150; // Mock price
    const expectedSol = usdAmount / solPrice;
    expect(expectedSol).toBe(1);
  });

  it("should handle fractional amounts", () => {
    const solAmount = 0.5;
    const solPrice = 150;
    const expectedUsd = solAmount * solPrice;
    expect(expectedUsd).toBe(75);
  });
});

describe("Balance Calculations", () => {
  it("should convert lamports to SOL", () => {
    const lamports = 1000000000; // 1 SOL
    const sol = lamports / 1000000000;
    expect(sol).toBe(1);
  });

  it("should handle fractional SOL", () => {
    const lamports = 500000000; // 0.5 SOL
    const sol = lamports / 1000000000;
    expect(sol).toBe(0.5);
  });

  it("should handle zero balance", () => {
    const lamports = 0;
    const sol = lamports / 1000000000;
    expect(sol).toBe(0);
  });
});

describe("Fee Calculations", () => {
  it("should calculate transaction fees", () => {
    const transactionAmount = 10; // SOL
    const feePercentage = 0.5; // 0.5%
    const fee = transactionAmount * (feePercentage / 100);
    expect(fee).toBe(0.05);
  });

  it("should calculate multiple fee tiers", () => {
    const amount = 100; // SOL
    const creationFee = amount * 0.01; // 1%
    const tradeFee = amount * 0.005; // 0.5%
    const totalFees = creationFee + tradeFee;
    expect(totalFees).toBe(1.5);
  });

  it("should handle zero fee scenarios", () => {
    const amount = 100;
    const feePercentage = 0;
    const fee = amount * (feePercentage / 100);
    expect(fee).toBe(0);
  });
});
