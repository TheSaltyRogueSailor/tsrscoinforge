import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addPriceHistory,
  countTokens,
  createComment,
  createToken,
  createTrade,
  deleteComment,
  getCommentsByToken,
  getPriceHistory,
  getTokenById,
  getTokensByCreator,
  getTradesByToken,
  getTradesByUser,
  listTokens,
  updateTokenStats,
  updateUserWallet,
  createReferral,
  getReferralsByReferrer,
  getReferralByCode,
  getReferralEarnings,
  updateUserHolding,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { walletRouter } from "./walletRouter";
import { fiatPaymentRouter } from "./fiatPaymentRouter";
import { portfolioRouter } from "./portfolioRouter";
import { paymentRouter } from "./paymentRouter";
import {
  calculateBuyCost,
  calculateGraduationProgress,
  calculateMarketCap,
  calculatePrice,
  calculateSellProceeds,
  ethToUSD,
  getBondingCurveParams,
  simulateTrade,
} from "./acceleratedBondingCurve";
import {
  getBuyFeePercent,
  getGraduationFeePercent,
  getSellFeePercent,
  getCreationFeeUSD,
  getBlockchainConfig,
} from "./config";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import type { BlockchainType } from "./config";
import { prepareCreationPayment, validatePaymentReceived } from "./paymentProcessor";
import { getWalletBalance } from "./blockchain";
import { TRPCError as TRPCErrorClass } from "@trpc/server";
import { prepareTokenCreation } from "./tokenCreation";
import { createSPLTokenTransaction, deploySPLToken, verifyTokenOnChain } from "./splTokenDeployment";

const BLOCKCHAINS = ["ethereum", "solana", "bsc", "base", "polygon", "arbitrum", "optimism"];

export const appRouter = router({
  system: systemRouter,
  wallet: walletRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Token Routers ────────────────────────────────────────────────────────

  tokens: router({
    // Step 1: Prepare SPL token creation transaction for user to sign
    prepareSPLTokenCreation: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          symbol: z.string().min(1).max(16),
          decimals: z.number().int().min(0).max(18).default(9),
          totalSupply: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.user.id) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'User not authenticated',
            });
          }

          console.log(`[Token Creation] Preparing SPL token for user ${ctx.user.id}`);
          console.log(`[Token Creation] Token: ${input.name} (${input.symbol})`);

          // For Solana, we need the user's public key
          // This should come from the frontend wallet connection
          const result = await createSPLTokenTransaction({
            creatorPublicKey: ctx.user.walletAddress || 'unknown',
            tokenName: input.name,
            tokenSymbol: input.symbol,
            decimals: input.decimals,
            totalSupply: input.totalSupply,
          });

          if (result.error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: result.error,
            });
          }

          return {
            transaction: result.transaction,
            estimatedCost: result.estimatedCost,
          };
        } catch (error) {
          console.error('[Token Creation] Error preparing SPL token:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to prepare token creation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }),

    // Step 2: Deploy SPL token after user signs
    deploySPLToken: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          symbol: z.string().min(1).max(16),
          decimals: z.number().int().min(0).max(18).default(9),
          totalSupply: z.number().int().positive(),
          description: z.string().max(1000).optional(),
          blockchain: z.literal('solana'),
          website: z.string().url().optional(),
          twitter: z.string().optional(),
          telegram: z.string().optional(),
          logoFile: z.string().optional(),
          signedTransaction: z.string(), // Base64 encoded signed transaction
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.user.id) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'User not authenticated',
            });
          }

          console.log(`[Token Creation] Deploying SPL token for user ${ctx.user.id}`);
          console.log(`[Token Creation] Token: ${input.name} (${input.symbol})`);

          // Deploy the token on-chain
          const deployResult = await deploySPLToken({
            creatorPublicKey: ctx.user.walletAddress || 'unknown',
            tokenName: input.name,
            tokenSymbol: input.symbol,
            decimals: input.decimals,
            totalSupply: input.totalSupply,
            signedTransactionBase64: input.signedTransaction,
          });

          if (!deployResult.success || !deployResult.mintAddress) {
            console.error('[Token Creation] Deployment failed:', deployResult.error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: deployResult.error || 'Failed to deploy token',
            });
          }

          const contractAddress = deployResult.mintAddress;
          console.log(`[Token Creation] Token deployed successfully: ${contractAddress}`);

          // Verify token exists on-chain
          const verification = await verifyTokenOnChain(contractAddress);
          if (!verification.exists) {
            console.warn('[Token Creation] Token verification failed:', verification.error);
          } else {
            console.log('[Token Creation] Token verified on-chain');
          }

          // Upload logo if provided
          let logoUrl: string | undefined;
          if (input.logoFile) {
            try {
              const buffer = Buffer.from(input.logoFile.split(",")[1] || input.logoFile, "base64");
              const fileKey = `tokens/${ctx.user.id}/${input.symbol}-${nanoid()}.png`;
              const result = await storagePut(fileKey, buffer, "image/png");
              logoUrl = result.url;
            } catch (err) {
              console.error("[Token Creation] Logo upload failed:", err);
            }
          }

          const config = getBlockchainConfig('solana' as BlockchainType);
          const creatorAllocation = (input.totalSupply * config.distribution.creatorAllocationPercent) / 100;

          // Store token in database with real contract address
          const tokenId = await createToken({
            name: input.name,
            symbol: input.symbol,
            description: input.description,
            blockchain: 'solana',
            totalSupply: input.totalSupply,
            circulatingSupply: creatorAllocation,
            creatorId: ctx.user.id,
            creatorWallet: ctx.user.walletAddress,
            contractAddress, // Real CA from on-chain deployment
            logoUrl,
            currentPriceUSD: "0.000001",
            website: input.website,
            twitter: input.twitter,
            telegram: input.telegram,
          });

          await addPriceHistory({
            tokenId,
            priceUSD: "0.000001",
            volumeUSD: "0",
            marketCapUSD: "0",
          });

          // Add creator's allocation to their holdings
          await updateUserHolding({
            userId: ctx.user.id,
            tokenId,
            balance: creatorAllocation.toString(),
            valueUSD: "0",
            unrealizedGain: "0",
            unrealizedGainPercent: "0",
          });

          console.log(`[Token Creation] Token created successfully: ID=${tokenId}, CA=${contractAddress}`);

          return {
            success: true,
            tokenId,
            contractAddress,
            transactionHash: deployResult.transactionHash,
            creatorAllocationPercent: config.distribution.creatorAllocationPercent,
            bondingCurvePercent: config.distribution.bondingCurvePercent,
          };
        } catch (error) {
          console.error('[Token Creation] Error deploying token:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to deploy token: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }),

    // Store token after client-side Solana deployment
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          symbol: z.string().min(1).max(16),
          decimals: z.number().int().min(0).max(18).default(9),
          description: z.string().max(1000).optional(),
          blockchain: z.literal('solana'),
          totalSupply: z.number().int().positive(),
          website: z.string().optional(),
          twitter: z.string().optional(),
          telegram: z.string().optional(),
          logoFile: z.string().optional(),
          contractAddress: z.string(), // Real CA from client-side deployment
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.user.id) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'User not authenticated',
            });
          }

          console.log(`[Token Creation] Storing token for user ${ctx.user.id}`);
          console.log(`[Token Creation] Token: ${input.name} (${input.symbol}), CA: ${input.contractAddress}`);

          const contractAddress = input.contractAddress;

          // Verify token exists on-chain
          const verification = await verifyTokenOnChain(contractAddress);
          if (!verification.exists) {
            console.warn('[Token Creation] Token verification failed:', verification.error);
          } else {
            console.log('[Token Creation] Token verified on-chain');
          }

          // Upload logo if provided
          let logoUrl: string | undefined;
          if (input.logoFile) {
            try {
              const buffer = Buffer.from(input.logoFile.split(",")[1] || input.logoFile, "base64");
              const fileKey = `tokens/${ctx.user.id}/${input.symbol}-${nanoid()}.png`;
              const result = await storagePut(fileKey, buffer, "image/png");
              logoUrl = result.url;
            } catch (err) {
              console.error("[Token Creation] Logo upload failed:", err);
            }
          }

          const config = getBlockchainConfig('solana' as BlockchainType);
          const creatorAllocation = (input.totalSupply * config.distribution.creatorAllocationPercent) / 100;

          // Store token in database with real contract address from on-chain deployment
          const tokenId = await createToken({
            name: input.name,
            symbol: input.symbol,
            description: input.description,
            blockchain: 'solana',
            totalSupply: input.totalSupply,
            circulatingSupply: creatorAllocation,
            creatorId: ctx.user.id,
            creatorWallet: ctx.user.walletAddress,
            contractAddress, // Real CA from client-side deployment
            logoUrl,
            currentPriceUSD: "0.000001",
            website: input.website,
            twitter: input.twitter,
            telegram: input.telegram,
          });

          await addPriceHistory({
            tokenId,
            priceUSD: "0.000001",
            volumeUSD: "0",
            marketCapUSD: "0",
          });

          // Add creator's allocation to their holdings
          await updateUserHolding({
            userId: ctx.user.id,
            tokenId,
            balance: creatorAllocation.toString(),
            valueUSD: "0",
            unrealizedGain: "0",
            unrealizedGainPercent: "0",
          });

          console.log(`[Token Creation] Token stored successfully: ID=${tokenId}, CA=${contractAddress}`);

          return {
            success: true,
            tokenId,
            contractAddress,
            creatorAllocationPercent: config.distribution.creatorAllocationPercent,
            bondingCurvePercent: config.distribution.bondingCurvePercent,
          };
        } catch (error) {
          console.error('[Token Creation] Error storing token:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to store token: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }),

    list: publicProcedure
      .input(
        z.object({
          blockchain: z.string().optional(),
          search: z.string().optional(),
          sortBy: z.enum(["createdAt", "marketCap", "volume", "price"]).optional(),
          limit: z.number().int().positive().max(100).default(20),
          offset: z.number().int().nonnegative().default(0),
        })
      )
      .query(async ({ input }) => {
        const tokens = await listTokens({
          blockchain: input.blockchain,
          search: input.search,
          sortBy: input.sortBy,
          limit: input.limit,
          offset: input.offset,
        });

        const total = await countTokens();

        return { tokens, total };
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const token = await getTokenById(input.id);
        if (!token) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Token not found",
          });
        }

        const config = getBlockchainConfig(token.blockchain as BlockchainType);
        const graduationProgress = calculateGraduationProgress(
          Number(token.circulatingSupply),
          Number(token.totalSupply),
          config.graduationThreshold
        );

        return { ...token, graduationProgress };
      }),

    getByCreator: publicProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getTokensByCreator(input.creatorId);
      }),

    getPriceHistory: publicProcedure
      .input(z.object({ tokenId: z.number().int().positive(), limit: z.number().int().max(365).default(100) }))
      .query(async ({ input }) => {
        return getPriceHistory(input.tokenId, input.limit);
      }),

    getBlockchainInfo: publicProcedure
      .input(z.object({ blockchain: z.enum(BLOCKCHAINS as [string, ...string[]]) }))
      .query(async ({ input }) => {
        const config = getBlockchainConfig(input.blockchain as BlockchainType);
        return {
          name: config.name,
          nativeToken: config.nativeToken,
          fees: config.fees,
          bondingCurve: config.bondingCurve,
          distribution: config.distribution,
          graduationThreshold: config.graduationThreshold,
        };
      }),
  }),

  // ─── Trade Routers ────────────────────────────────────────────────────────

  trades: router({
    simulateBuy: publicProcedure
      .input(
        z.object({
          tokenId: z.number().int().positive(),
          amount: z.number().positive(),
        })
      )
      .query(async ({ input }) => {
        const token = await getTokenById(input.tokenId);
        if (!token) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
        }

        const params = getBondingCurveParams(token.blockchain as BlockchainType);
        const simulation = simulateTrade("buy", Number(token.circulatingSupply), input.amount, params);
        const buyFeePercent = getBuyFeePercent(token.blockchain as any);
        const fee = simulation.ethAmount * (buyFeePercent / 100);

        return {
          ...simulation,
          buyFeePercent,
          feeAmount: fee,
          totalCost: simulation.ethAmount + fee,
        };
      }),

    simulateSell: publicProcedure
      .input(
        z.object({
          tokenId: z.number().int().positive(),
          amount: z.number().positive(),
        })
      )
      .query(async ({ input }) => {
        const token = await getTokenById(input.tokenId);
        if (!token) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
        }

        const params = getBondingCurveParams(token.blockchain as BlockchainType);
        const simulation = simulateTrade("sell", Number(token.circulatingSupply), input.amount, params);
        const sellFeePercent = getSellFeePercent(token.blockchain as any);
        const fee = simulation.ethAmount * (sellFeePercent / 100);

        return {
          ...simulation,
          sellFeePercent,
          feeAmount: fee,
          netProceeds: simulation.ethAmount - fee,
        };
      }),

    buy: protectedProcedure
      .input(
        z.object({
          tokenId: z.number().int().positive(),
          amount: z.number().positive(),
          txHash: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const token = await getTokenById(input.tokenId);
        if (!token) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
        }

        const params = getBondingCurveParams(token.blockchain as BlockchainType);
        const { ethAmount, averagePrice } = calculateBuyCost(Number(token.circulatingSupply), input.amount, params);
        const priceUSD = ethToUSD(averagePrice);
        const buyFeePercent = getBuyFeePercent(token.blockchain as any);
        const feeAmount = ethAmount * (buyFeePercent / 100);

        const tradeId = await createTrade({
          tokenId: input.tokenId,
          userId: ctx.user.id,
          walletAddress: ctx.user.walletAddress,
          tradeType: "buy",
          tokenAmount: input.amount.toString(),
          ethAmount: ethAmount.toString(),
          priceUSD: priceUSD.toString(),
          blockchain: token.blockchain,
          txHash: input.txHash,
        });

        const newSupply = Number(token.circulatingSupply) + input.amount;
        const newPrice = calculatePrice(newSupply, params);
        const newMarketCap = calculateMarketCap(newSupply, newPrice);
        const newVolume = Number(token.totalVolumeUSD) + ethToUSD(ethAmount);

        await updateTokenStats(input.tokenId, {
          circulatingSupply: newSupply,
          currentPriceUSD: newPrice.toString(),
          marketCapUSD: newMarketCap.toString(),
          totalVolumeUSD: newVolume.toString(),
          volume24hUSD: (Number(token.volume24hUSD) + ethToUSD(ethAmount)).toString(),
          tradeCount: Number(token.tradeCount) + 1,
        });

        await addPriceHistory({
          tokenId: input.tokenId,
          priceUSD: newPrice.toString(),
          volumeUSD: ethToUSD(ethAmount).toString(),
          marketCapUSD: newMarketCap.toString(),
        });

        return { success: true, tradeId, feeAmount, totalCost: ethAmount + feeAmount };
      }),

    sell: protectedProcedure
      .input(
        z.object({
          tokenId: z.number().int().positive(),
          amount: z.number().positive(),
          txHash: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const token = await getTokenById(input.tokenId);
        if (!token) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
        }

        if (Number(token.circulatingSupply) < input.amount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Insufficient token supply",
          });
        }

        const params = getBondingCurveParams(token.blockchain as BlockchainType);
        const { ethAmount, averagePrice } = calculateSellProceeds(Number(token.circulatingSupply), input.amount, params);
        const priceUSD = ethToUSD(averagePrice);
        const sellFeePercent = getSellFeePercent(token.blockchain as any);
        const feeAmount = ethAmount * (sellFeePercent / 100);

        const tradeId = await createTrade({
          tokenId: input.tokenId,
          userId: ctx.user.id,
          walletAddress: ctx.user.walletAddress,
          tradeType: "sell",
          tokenAmount: input.amount.toString(),
          ethAmount: ethAmount.toString(),
          priceUSD: priceUSD.toString(),
          blockchain: token.blockchain,
          txHash: input.txHash,
        });

        const newSupply = Math.max(0, Number(token.circulatingSupply) - input.amount);
        const newPrice = calculatePrice(newSupply, params);
        const newMarketCap = calculateMarketCap(newSupply, newPrice);
        const newVolume = Number(token.totalVolumeUSD) + ethToUSD(ethAmount);

        await updateTokenStats(input.tokenId, {
          circulatingSupply: newSupply,
          currentPriceUSD: newPrice.toString(),
          marketCapUSD: newMarketCap.toString(),
          totalVolumeUSD: newVolume.toString(),
          volume24hUSD: (Number(token.volume24hUSD) + ethToUSD(ethAmount)).toString(),
          tradeCount: Number(token.tradeCount) + 1,
        });

        await addPriceHistory({
          tokenId: input.tokenId,
          priceUSD: newPrice.toString(),
          volumeUSD: ethToUSD(ethAmount).toString(),
          marketCapUSD: newMarketCap.toString(),
        });

        return { success: true, tradeId, feeAmount, netProceeds: ethAmount - feeAmount };
      }),

    getByToken: publicProcedure
      .input(z.object({ tokenId: z.number().int().positive(), limit: z.number().int().max(100).default(50) }))
      .query(async ({ input }) => {
        return getTradesByToken(input.tokenId, input.limit);
      }),

    getByUser: protectedProcedure
      .input(z.object({ limit: z.number().int().max(100).default(50) }))
      .query(async ({ ctx, input }) => {
        return getTradesByUser(ctx.user.id, input.limit);
      }),
  }),

  // ─── Comment Routers ──────────────────────────────────────────────────────

  comments: router({
    create: protectedProcedure
      .input(
        z.object({
          tokenId: z.number().int().positive(),
          content: z.string().min(1).max(500),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const token = await getTokenById(input.tokenId);
        if (!token) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
        }

        const commentId = await createComment({
          tokenId: input.tokenId,
          userId: ctx.user.id,
          content: input.content,
        });

        return { success: true, commentId };
      }),

    getByToken: publicProcedure
      .input(z.object({ tokenId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getCommentsByToken(input.tokenId);
      }),

    delete: protectedProcedure
      .input(z.object({ commentId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteComment(input.commentId, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── User Profile Routers ─────────────────────────────────────────────────

  users: router({
    updateWallet: protectedProcedure
      .input(
        z.object({
          walletAddress: z.string().min(1),
          walletChain: z.enum(BLOCKCHAINS as [string, ...string[]]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserWallet(ctx.user.id, input.walletAddress, input.walletChain);
        return { success: true };
      }),

    getCreatedTokens: publicProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getTokensByCreator(input.userId);
      }),

    getUserTrades: publicProcedure
      .input(z.object({ userId: z.number().int().positive(), limit: z.number().int().max(100).default(50) }))
      .query(async ({ input }) => {
        return getTradesByUser(input.userId, input.limit);
      }),
  }),

  // ─── Referral Routers ─────────────────────────────────────────────────────

  referrals: router({
    generateCode: protectedProcedure.mutation(async ({ ctx }) => {
      const code = nanoid(8).toUpperCase();
      const referralId = await createReferral({
        referrerId: ctx.user.id,
        referredUserId: ctx.user.id, // Will be updated when someone uses the code
        referralCode: code,
        rewardPercentage: 10,
      });
      return { code, referralId };
    }),

    getMyReferrals: protectedProcedure.query(async ({ ctx }) => {
      return getReferralsByReferrer(ctx.user.id);
    }),

    getReferralByCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return getReferralByCode(input.code);
      }),

    getReferralStats: protectedProcedure.query(async ({ ctx }) => {
      const referrals = await getReferralsByReferrer(ctx.user.id);
      
      const stats = {
        totalReferrals: referrals.length,
        totalEarnings: referrals.reduce((sum, r) => sum + parseFloat(r.totalEarnings || "0"), 0),
        referrals: referrals.map(r => ({
          id: r.id,
          code: r.referralCode,
          earnings: parseFloat(r.totalEarnings || "0"),
          createdAt: r.createdAt,
        })),
      };
      return stats;
    }),
  }),

  // ─── Payment Router ───────────────────────────────────────────────────────

  payment: router({
    prepareCreationPayment: protectedProcedure
      .input(
        z.object({
          blockchain: z.enum(BLOCKCHAINS as [string, ...string[]]),
          tokenSymbol: z.string().min(1).max(16),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          if (!ctx.user.walletAddress) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Wallet not set up. Please create or import a wallet first.",
            });
          }

          const vaultAddress = process.env.SOLANA_VAULT_ADDRESS;
          if (!vaultAddress) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Vault address not configured",
            });
          }

          const paymentData = await prepareCreationPayment({
            userWalletAddress: ctx.user.walletAddress,
            vaultAddress,
            blockchain: input.blockchain as BlockchainType,
            tokenSymbol: input.tokenSymbol,
          });

          return paymentData;
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to prepare payment",
          });
        }
      }),

    validatePayment: protectedProcedure
      .input(
        z.object({
          transactionHash: z.string(),
          blockchain: z.enum(BLOCKCHAINS as [string, ...string[]]),
          expectedAmount: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const vaultAddress = process.env.SOLANA_VAULT_ADDRESS;
          if (!vaultAddress) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Vault address not configured",
            });
          }

          const isValid = await validatePaymentReceived({
            transactionHash: input.transactionHash,
            blockchain: input.blockchain as BlockchainType,
            expectedAmount: input.expectedAmount,
            vaultAddress,
          });

          return { isValid, transactionHash: input.transactionHash };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to validate payment",
          });
        }
      }),
  }),

  fiatPayment: fiatPaymentRouter,
  portfolio: portfolioRouter,
  payments: paymentRouter,
});

export type AppRouter = typeof appRouter;
