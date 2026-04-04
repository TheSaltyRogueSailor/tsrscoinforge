import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  generateMoonPayUrl,
  createStripePaymentIntent,
  validateFiatPayment,
  getSupportedFiatCurrencies,
  getSupportedPaymentMethods,
  calculateFiatPaymentTotal,
  formatFiatAmount,
} from "./fiatPayment";
import { TRPCError } from "@trpc/server";

export const fiatPaymentRouter = router({
  /**
   * Get supported payment methods
   */
  getSupportedMethods: protectedProcedure.query(() => {
    return getSupportedPaymentMethods();
  }),

  /**
   * Get supported fiat currencies
   */
  getSupportedCurrencies: protectedProcedure.query(() => {
    return getSupportedFiatCurrencies();
  }),

  /**
   * Calculate payment total with fees
   */
  calculateTotal: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        method: z.enum(["moonpay", "stripe"]),
      })
    )
    .query(({ input }) => {
      try {
        return calculateFiatPaymentTotal(input);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid payment method or amount",
        });
      }
    }),

  /**
   * Generate MoonPay payment URL
   */
  generateMoonPayUrl: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        currency: z.enum(["USD", "EUR", "GBP"]),
        cryptoSymbol: z.string(),
        blockchain: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user.walletAddress) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Wallet address required",
          });
        }

        const url = generateMoonPayUrl({
          method: "moonpay",
          amount: input.amount,
          currency: input.currency,
          cryptoAmount: 0, // Calculated by MoonPay
          cryptoSymbol: input.cryptoSymbol,
          walletAddress: ctx.user.walletAddress,
          blockchain: input.blockchain,
          returnUrl: `${process.env.VITE_FRONTEND_URL || "http://localhost:5173"}/wallet`,
        });

        return { url, provider: "moonpay" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate MoonPay URL",
        });
      }
    }),

  /**
   * Create Stripe payment intent
   */
  createStripePaymentIntent: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        currency: z.enum(["USD", "EUR", "GBP"]),
        cryptoSymbol: z.string(),
        blockchain: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user.walletAddress) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Wallet address required",
          });
        }

        const paymentIntent = await createStripePaymentIntent({
          method: "stripe",
          amount: input.amount,
          currency: input.currency,
          cryptoAmount: 0,
          cryptoSymbol: input.cryptoSymbol,
          walletAddress: ctx.user.walletAddress,
          blockchain: input.blockchain,
          returnUrl: `${process.env.VITE_FRONTEND_URL || "http://localhost:5173"}/wallet`,
        });

        return {
          ...paymentIntent,
          provider: "stripe",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Stripe payment intent",
        });
      }
    }),

  /**
   * Validate fiat payment and route crypto
   */
  validatePayment: protectedProcedure
    .input(
      z.object({
        paymentMethod: z.enum(["moonpay", "stripe"]),
        paymentId: z.string(),
        cryptoAmount: z.number().positive(),
        cryptoSymbol: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user.walletAddress) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Wallet address required",
          });
        }

        const result = await validateFiatPayment({
          paymentMethod: input.paymentMethod,
          paymentId: input.paymentId,
          walletAddress: ctx.user.walletAddress,
          cryptoAmount: input.cryptoAmount,
          cryptoSymbol: input.cryptoSymbol,
        });

        return result;
      } catch (error) {
        console.error("Error validating payment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to validate payment",
        });
      }
    }),

  /**
   * Format fiat amount for display
   */
  formatAmount: protectedProcedure
    .input(
      z.object({
        amount: z.number(),
        currency: z.string(),
      })
    )
    .query(({ input }) => {
      return formatFiatAmount(input.amount, input.currency);
    }),
});
