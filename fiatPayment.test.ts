import { describe, it, expect } from "vitest";
import {
  generateMoonPayUrl,
  getSupportedFiatCurrencies,
  getSupportedPaymentMethods,
  calculateFiatPaymentTotal,
  formatFiatAmount,
} from "./fiatPayment";

describe("Fiat Payment Integration", () => {
  describe("getSupportedPaymentMethods", () => {
    it("should return array of supported payment methods", () => {
      const methods = getSupportedPaymentMethods();
      expect(methods).toBeInstanceOf(Array);
      expect(methods.length).toBeGreaterThan(0);
    });

    it("should include MoonPay method", () => {
      const methods = getSupportedPaymentMethods();
      const moonpay = methods.find((m) => m.id === "moonpay");
      expect(moonpay).toBeDefined();
      expect(moonpay?.name).toBe("MoonPay");
    });

    it("should include Stripe method", () => {
      const methods = getSupportedPaymentMethods();
      const stripe = methods.find((m) => m.id === "stripe");
      expect(stripe).toBeDefined();
      expect(stripe?.name).toBe("Stripe");
    });

    it("should have valid fee percentages", () => {
      const methods = getSupportedPaymentMethods();
      methods.forEach((method) => {
        expect(method.fees).toBeGreaterThan(0);
        expect(method.fees).toBeLessThan(10);
      });
    });
  });

  describe("getSupportedFiatCurrencies", () => {
    it("should return array of supported currencies", () => {
      const currencies = getSupportedFiatCurrencies();
      expect(currencies).toBeInstanceOf(Array);
      expect(currencies.length).toBeGreaterThan(0);
    });

    it("should include USD", () => {
      const currencies = getSupportedFiatCurrencies();
      const usd = currencies.find((c) => c.code === "USD");
      expect(usd).toBeDefined();
      expect(usd?.symbol).toBe("$");
    });

    it("should include EUR", () => {
      const currencies = getSupportedFiatCurrencies();
      const eur = currencies.find((c) => c.code === "EUR");
      expect(eur).toBeDefined();
      expect(eur?.symbol).toBe("€");
    });
  });

  describe("calculateFiatPaymentTotal", () => {
    it("should calculate MoonPay total with fees", () => {
      const result = calculateFiatPaymentTotal({
        amount: 100,
        method: "moonpay",
      });

      expect(result.subtotal).toBe(100);
      expect(result.fees).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(100);
    });

    it("should calculate Stripe total with fees", () => {
      const result = calculateFiatPaymentTotal({
        amount: 100,
        method: "stripe",
      });

      expect(result.subtotal).toBe(100);
      expect(result.fees).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(100);
    });

    it("should have Stripe fees lower than MoonPay", () => {
      const moonpayResult = calculateFiatPaymentTotal({
        amount: 100,
        method: "moonpay",
      });

      const stripeResult = calculateFiatPaymentTotal({
        amount: 100,
        method: "stripe",
      });

      expect(stripeResult.fees).toBeLessThan(moonpayResult.fees);
    });

    it("should calculate fees correctly", () => {
      const result = calculateFiatPaymentTotal({
        amount: 100,
        method: "stripe",
      });

      // Stripe is 2.9%
      const expectedFees = (100 * 2.9) / 100;
      expect(result.fees).toBeCloseTo(expectedFees, 2);
    });
  });

  describe("formatFiatAmount", () => {
    it("should format USD amount with dollar sign", () => {
      const formatted = formatFiatAmount(100.5, "USD");
      expect(formatted).toBe("$100.50");
    });

    it("should format EUR amount with euro sign", () => {
      const formatted = formatFiatAmount(100.5, "EUR");
      expect(formatted).toBe("€100.50");
    });

    it("should format GBP amount with pound sign", () => {
      const formatted = formatFiatAmount(100.5, "GBP");
      expect(formatted).toBe("£100.50");
    });

    it("should handle zero amount", () => {
      const formatted = formatFiatAmount(0, "USD");
      expect(formatted).toBe("$0.00");
    });

    it("should handle large amounts", () => {
      const formatted = formatFiatAmount(10000.99, "USD");
      expect(formatted).toBe("$10000.99");
    });
  });

  describe("generateMoonPayUrl", () => {
    it("should throw error if MOONPAY_API_KEY not set", () => {
      const originalEnv = process.env.MOONPAY_API_KEY;
      delete process.env.MOONPAY_API_KEY;

      expect(() => {
        generateMoonPayUrl({
          method: "moonpay",
          amount: 100,
          currency: "USD",
          cryptoAmount: 0.5,
          cryptoSymbol: "SOL",
          walletAddress: "test-wallet",
          blockchain: "solana",
          returnUrl: "http://localhost:3000/wallet",
        });
      }).toThrow();

      process.env.MOONPAY_API_KEY = originalEnv;
    });
  });
});
