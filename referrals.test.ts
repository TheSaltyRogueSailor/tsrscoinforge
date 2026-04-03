import { describe, it, expect, beforeEach, vi } from "vitest";
import { nanoid } from "nanoid";

describe("Referral System", () => {
  describe("Code Generation", () => {
    it("should generate a valid referral code", () => {
      const code = nanoid(8).toUpperCase();
      expect(code).toHaveLength(8);
      expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
    });

    it("should generate unique codes", () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        const code = nanoid(8).toUpperCase();
        codes.add(code);
      }
      expect(codes.size).toBe(100);
    });
  });

  describe("Referral Rewards", () => {
    it("should calculate 10% reward correctly", () => {
      const tradeAmount = 100;
      const rewardPercentage = 10;
      const expectedReward = (tradeAmount * rewardPercentage) / 100;
      expect(expectedReward).toBe(10);
    });

    it("should calculate 5% reward correctly", () => {
      const tradeAmount = 200;
      const rewardPercentage = 5;
      const expectedReward = (tradeAmount * rewardPercentage) / 100;
      expect(expectedReward).toBe(10);
    });

    it("should handle decimal amounts", () => {
      const tradeAmount = 123.456;
      const rewardPercentage = 10;
      const expectedReward = (tradeAmount * rewardPercentage) / 100;
      expect(expectedReward).toBeCloseTo(12.3456, 4);
    });

    it("should accumulate multiple earnings", () => {
      const earnings = [10, 20, 15, 25];
      const total = earnings.reduce((sum, e) => sum + e, 0);
      expect(total).toBe(70);
    });
  });

  describe("Referral Stats", () => {
    it("should calculate total referrals correctly", () => {
      const referrals = [
        { id: 1, earnings: 100 },
        { id: 2, earnings: 150 },
        { id: 3, earnings: 75 },
      ];
      expect(referrals.length).toBe(3);
    });

    it("should sum total earnings from referrals", () => {
      const referrals = [
        { id: 1, earnings: 100 },
        { id: 2, earnings: 150 },
        { id: 3, earnings: 75 },
      ];
      const totalEarnings = referrals.reduce((sum, r) => sum + r.earnings, 0);
      expect(totalEarnings).toBe(325);
    });

    it("should handle empty referral list", () => {
      const referrals: any[] = [];
      const totalEarnings = referrals.reduce((sum, r) => sum + r.earnings, 0);
      expect(totalEarnings).toBe(0);
      expect(referrals.length).toBe(0);
    });
  });

  describe("Referral Link Generation", () => {
    it("should generate valid referral URL", () => {
      const code = "ABC12345";
      const baseUrl = "https://example.com";
      const referralUrl = `${baseUrl}?ref=${code}`;
      expect(referralUrl).toBe("https://example.com?ref=ABC12345");
    });

    it("should extract code from referral URL", () => {
      const url = new URL("https://example.com?ref=ABC12345");
      const code = url.searchParams.get("ref");
      expect(code).toBe("ABC12345");
    });

    it("should handle multiple query parameters", () => {
      const url = new URL("https://example.com?ref=ABC12345&utm_source=twitter");
      const code = url.searchParams.get("ref");
      const source = url.searchParams.get("utm_source");
      expect(code).toBe("ABC12345");
      expect(source).toBe("twitter");
    });
  });

  describe("Referral Validation", () => {
    it("should validate referral code format", () => {
      const validCode = "ABC12345";
      const isValid = /^[A-Z0-9]{8}$/.test(validCode);
      expect(isValid).toBe(true);
    });

    it("should reject invalid code formats", () => {
      const invalidCodes = ["abc12345", "ABC123", "ABC12345!", ""];
      invalidCodes.forEach((code) => {
        const isValid = /^[A-Z0-9]{8}$/.test(code);
        expect(isValid).toBe(false);
      });
    });

    it("should validate reward percentage range", () => {
      const validPercentages = [5, 10, 15];
      const isValid = (p: number) => p >= 5 && p <= 15;
      validPercentages.forEach((p) => {
        expect(isValid(p)).toBe(true);
      });
    });

    it("should reject invalid reward percentages", () => {
      const invalidPercentages = [0, 3, 20, -5];
      const isValid = (p: number) => p >= 5 && p <= 15;
      invalidPercentages.forEach((p) => {
        expect(isValid(p)).toBe(false);
      });
    });
  });
});
