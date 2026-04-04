import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getUserHoldings,
  getUserHolding,
  updateUserHolding,
  getTokenHolders,
  getPortfolioStats,
  getTokenById,
} from "./db";

export const portfolioRouter = router({
  /**
   * Get user's portfolio (all holdings)
   */
  getPortfolio: protectedProcedure.query(async ({ ctx }) => {
    const holdings = await getUserHoldings(ctx.user.id);
    
    // Enrich with token details
    const enrichedHoldings = await Promise.all(
      holdings.map(async (holding) => {
        const token = await getTokenById(holding.tokenId);
        return {
          ...holding,
          token: token || null,
        };
      })
    );

    return enrichedHoldings;
  }),

  /**
   * Get portfolio statistics
   */
  getPortfolioStats: protectedProcedure.query(async ({ ctx }) => {
    return getPortfolioStats(ctx.user.id);
  }),

  /**
   * Get specific holding
   */
  getHolding: protectedProcedure
    .input(z.object({ tokenId: z.number() }))
    .query(async ({ ctx, input }) => {
      const holding = await getUserHolding(ctx.user.id, input.tokenId);
      if (!holding) {
        return null;
      }

      const token = await getTokenById(holding.tokenId);
      return {
        ...holding,
        token,
      };
    }),

  /**
   * Get token holders (for token detail page)
   */
  getTokenHolders: protectedProcedure
    .input(z.object({ tokenId: z.number(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const holders = await getTokenHolders(input.tokenId);
      return holders.slice(0, input.limit);
    }),

  /**
   * Update holding (internal use - called after trade)
   */
  updateHolding: protectedProcedure
    .input(
      z.object({
        tokenId: z.number(),
        balance: z.string().optional(),
        valueUSD: z.string().optional(),
        averageBuyPrice: z.string().optional(),
        totalSpent: z.string().optional(),
        totalSold: z.string().optional(),
        unrealizedGain: z.string().optional(),
        unrealizedGainPercent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateUserHolding({
        userId: ctx.user.id,
        tokenId: input.tokenId,
        balance: input.balance,
        valueUSD: input.valueUSD,
        averageBuyPrice: input.averageBuyPrice,
        totalSpent: input.totalSpent,
        totalSold: input.totalSold,
        unrealizedGain: input.unrealizedGain,
        unrealizedGainPercent: input.unrealizedGainPercent,
      });

      return { success: true };
    }),
});
