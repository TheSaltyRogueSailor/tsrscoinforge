import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { generateWallet, encryptWallet, decryptWallet, isValidSeedPhrase, importWalletFromSeedPhrase } from "./wallet";
import { updateUserWallet } from "./db";
import { getWalletBalance, isValidWalletAddress } from "./blockchain";
import type { BlockchainType } from "./config";

export const walletRouter = router({
  /**
   * Generate a new wallet for the user
   */
  generate: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const wallet = generateWallet();

      return {
        success: true,
        publicKey: wallet.publicKey,
        mnemonic: wallet.mnemonic,
        warning:
          "IMPORTANT: Write down your seed phrase and store it safely. TSRS cannot recover it if lost. Never share it with anyone.",
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate wallet",
      });
    }
  }),

  /**
   * Save encrypted wallet to user account
   */
  save: protectedProcedure
    .input(
      z.object({
        publicKey: z.string(),
        encryptedSecretKey: z.string(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await updateUserWallet(ctx.user.id, input.publicKey, "solana");

        return { success: true, message: "Wallet saved successfully" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save wallet",
        });
      }
    }),

  /**
   * Import wallet from seed phrase
   */
  import: protectedProcedure
    .input(
      z.object({
        seedPhrase: z.string(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!isValidSeedPhrase(input.seedPhrase)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid seed phrase. Please check and try again.",
          });
        }

        const wallet = importWalletFromSeedPhrase(input.seedPhrase);
        const encrypted = encryptWallet(wallet.secretKey, input.password);

        await updateUserWallet(ctx.user.id, wallet.publicKey, "solana");

        return {
          success: true,
          publicKey: wallet.publicKey,
          message: "Wallet imported successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to import wallet",
        });
      }
    }),

  /**
   * Get user's wallet address
   */
  getAddress: protectedProcedure.query(async ({ ctx }) => {
    return {
      address: ctx.user.walletAddress || null,
      chain: ctx.user.walletChain || null,
    };
  }),

  /**
   * Validate seed phrase
   */
  validateSeedPhrase: protectedProcedure
    .input(z.object({ seedPhrase: z.string() }))
    .query(({ input }) => {
      return {
        valid: isValidSeedPhrase(input.seedPhrase),
      };
    }),

  /**
   * Get wallet balance for a specific blockchain
   */
  getBalance: protectedProcedure
    .input(
      z.object({
        blockchain: z.enum([
          "ethereum",
          "solana",
          "bsc",
          "base",
          "polygon",
          "arbitrum",
          "optimism",
        ] as const),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user.walletAddress) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Wallet not set up. Please create or import a wallet first.",
          });
        }

        if (!isValidWalletAddress(ctx.user.walletAddress, input.blockchain as BlockchainType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid wallet address format for this blockchain.",
          });
        }

        const balanceData = await getWalletBalance(
          ctx.user.walletAddress,
          input.blockchain as BlockchainType
        );

        return {
          balance: balanceData.balance,
          symbol: balanceData.symbol,
          address: ctx.user.walletAddress,
          blockchain: input.blockchain,
        };
      } catch (error) {
        console.error("Error fetching wallet balance:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch balance for ${input.blockchain}. Please try again.`,
        });
      }
    }),

  /**
   * Validate wallet address for a blockchain
   */
  validateAddress: protectedProcedure
    .input(
      z.object({
        address: z.string(),
        blockchain: z.enum([
          "ethereum",
          "solana",
          "bsc",
          "base",
          "polygon",
          "arbitrum",
          "optimism",
        ] as const),
      })
    )
    .query(({ input }) => {
      const isValid = isValidWalletAddress(input.address, input.blockchain as BlockchainType);
      return { isValid, address: input.address, blockchain: input.blockchain };
    }),
});

export default walletRouter;
