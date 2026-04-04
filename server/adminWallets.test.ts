import { describe, it, expect } from "vitest";
import { isAdminWallet, ADMIN_WALLETS } from "./adminWallets";

describe("Admin Wallets", () => {
  it("should identify admin wallet correctly", () => {
    const adminWallet = "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8";
    expect(isAdminWallet(adminWallet)).toBe(true);
  });

  it("should reject non-admin wallet", () => {
    const regularWallet = "11111111111111111111111111111111";
    expect(isAdminWallet(regularWallet)).toBe(false);
  });

  it("should handle null wallet address", () => {
    expect(isAdminWallet(null)).toBe(false);
  });

  it("should handle undefined wallet address", () => {
    expect(isAdminWallet(undefined)).toBe(false);
  });

  it("should handle empty string wallet address", () => {
    expect(isAdminWallet("")).toBe(false);
  });

  it("should contain at least one admin wallet", () => {
    expect(ADMIN_WALLETS.length).toBeGreaterThan(0);
  });

  it("should contain the main admin wallet", () => {
    expect(ADMIN_WALLETS).toContain("9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8");
  });
});
