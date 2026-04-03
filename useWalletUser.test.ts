import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWalletUser } from "./useWalletUser";

// Mock the useWallet hook
vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: vi.fn(() => ({
    publicKey: null,
    connected: false,
  })),
}));

// Mock the admin wallets
vi.mock("@/lib/adminWallets", () => ({
  isAdminWallet: vi.fn((address) => 
    address === "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8"
  ),
}));

describe("useWalletUser", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return default values when wallet not connected", () => {
    const { result } = renderHook(() => useWalletUser());
    
    expect(result.current.walletAddress).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.shortAddress).toBeNull();
  });

  it("should have correct interface properties", () => {
    const { result } = renderHook(() => useWalletUser());
    
    expect(result.current).toHaveProperty("walletAddress");
    expect(result.current).toHaveProperty("isConnected");
    expect(result.current).toHaveProperty("isAdmin");
    expect(result.current).toHaveProperty("shortAddress");
  });
});
