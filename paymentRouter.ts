import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getCreationFeeInCrypto } from "./paymentProcessor";
import { getCreationFeeUSD } from "./config";
import { createSolanaTransaction, createEVMTransaction, signSolanaTransaction, signEVMTransaction, submitTransaction } from "./transactionSigner";

export const paymentRouter = router({
  /**
   * Calculate creation fee for a token
   */
  calculateCreationFee: publicProcedure
    .input(z.object({
      blockchain: z.string(),
      isAdmin: z.boolean().optional(),
    }))
    .query(async ({ input }: any) => {
      const feeData = getCreationFeeInCrypto(input.blockchain as any);
      const feeUSD = getCreationFeeUSD(input.blockchain as any);
      
      // Admin users pay $0
      if (input.isAdmin) {
        return {
          blockchain: input.blockchain,
          feeUSD: 0,
          feeCrypto: 0,
          feeSymbol: "",
        };
      }

      return {
        blockchain: input.blockchain,
        feeUSD: feeUSD,
        feeCrypto: feeData.amountCrypto,
        feeSymbol: feeData.symbol,
      };
    }),

  /**
   * Create payment transaction for coin creation
   */
  createPaymentTransaction: protectedProcedure
    .input(z.object({
      blockchain: z.string(),
      fromAddress: z.string(),
      amount: z.string(),
      isSolana: z.boolean(),
    }))
    .mutation(async ({ input, ctx }: any) => {
      // Check if user is admin (free creation)
      if (ctx.user.role === "admin") {
        return {
          success: true,
          message: "Admin user - no payment required",
          feeWaived: true,
        };
      }

      try {
        if (input.isSolana) {
          // Create Solana transaction
          const vaultAddress = process.env.SOLANA_VAULT_ADDRESS;
          if (!vaultAddress) {
            throw new Error("Vault address not configured");
          }

          const result = await createSolanaTransaction({
            fromPublicKey: input.fromAddress,
            toPublicKey: vaultAddress,
            lamports: Math.floor(parseFloat(input.amount) * 1e9), // Convert SOL to lamports
          });

          return result;
        } else {
          // Create EVM transaction
          const vaultAddress = process.env.EVM_VAULT_ADDRESS;
          if (!vaultAddress) {
            throw new Error("Vault address not configured");
          }

          const result = await createEVMTransaction({
            chain: input.blockchain as any,
            fromAddress: input.fromAddress,
            toAddress: vaultAddress,
            amount: input.amount, // Should be in wei
          });

          return result;
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to create payment transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),

  /**
   * Sign payment transaction
   */
  signPaymentTransaction: protectedProcedure
    .input(z.object({
      transactionData: z.any(),
      privateKey: z.string(),
      isSolana: z.boolean(),
    }))
    .mutation(async ({ input }: any) => {
      try {
        if (input.isSolana) {
          const result = await signSolanaTransaction({
            transactionBase64: input.transactionData,
            privateKey: input.privateKey,
          });
          return result;
        } else {
          const result = await signEVMTransaction({
            transaction: input.transactionData,
            privateKey: input.privateKey,
          });
          return result;
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to sign transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),

  /**
   * Submit signed payment transaction
   */
  submitPaymentTransaction: protectedProcedure
    .input(z.object({
      signedTransaction: z.string(),
      blockchain: z.string(),
      isSolana: z.boolean(),
    }))
    .mutation(async ({ input }: any) => {
      try {
        const result = await submitTransaction({
          chain: input.blockchain,
          signedTransaction: input.signedTransaction,
          isSolana: input.isSolana,
        });

        if (result.success) {
          return {
            success: true,
            txHash: result.txHash,
            message: result.message,
            explorerUrl: getExplorerUrl(input.blockchain, result.txHash),
          };
        }

        return result;
      } catch (error) {
        return {
          success: false,
          error: `Failed to submit transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),

  /**
   * Get payment methods available
   */
  getPaymentMethods: publicProcedure
    .query(async () => {
      return {
        methods: [
          {
            id: "crypto",
            name: "Cryptocurrency",
            description: "Pay with SOL, ETH, or other crypto",
            icon: "💰",
          },
          {
            id: "moonpay",
            name: "MoonPay",
            description: "Buy crypto with credit/debit card",
            icon: "💳",
          },
          {
            id: "stripe",
            name: "Stripe",
            description: "Pay with credit/debit card",
            icon: "💳",
          },
        ],
      };
    }),

  /**
   * Get transaction status
   */
  getTransactionStatus: publicProcedure
    .input(z.object({
      txHash: z.string(),
      blockchain: z.string(),
      isSolana: z.boolean(),
    }))
    .query(async ({ input }: any) => {
      try {
        if (input.isSolana) {
          const { Connection } = await import("@solana/web3.js");
          const { RPC_ENDPOINTS } = await import("./blockchain");
          const connection = new Connection(RPC_ENDPOINTS.solana);
          const status = await connection.getSignatureStatus(input.txHash);

          return {
            success: true,
            status: status.value?.confirmationStatus || "pending",
            confirmed: status.value?.confirmationStatus === "finalized",
            txHash: input.txHash,
          };
        } else {
          // EVM status check
          const { RPC_ENDPOINTS } = await import("./blockchain");
          const { ethers } = await import("ethers");
          const rpcUrl = RPC_ENDPOINTS[input.blockchain as keyof typeof RPC_ENDPOINTS];
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const receipt = await provider.getTransactionReceipt(input.txHash);

          return {
            success: true,
            status: receipt ? "confirmed" : "pending",
            confirmed: !!receipt,
            txHash: input.txHash,
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to get transaction status: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),
});

/**
 * Get explorer URL for transaction
 */
function getExplorerUrl(blockchain: string, txHash: string): string {
  const explorers: Record<string, string> = {
    solana: `https://solscan.io/tx/${txHash}`,
    ethereum: `https://etherscan.io/tx/${txHash}`,
    bsc: `https://bscscan.com/tx/${txHash}`,
    base: `https://basescan.org/tx/${txHash}`,
    polygon: `https://polygonscan.com/tx/${txHash}`,
    arbitrum: `https://arbiscan.io/tx/${txHash}`,
    optimism: `https://optimistic.etherscan.io/tx/${txHash}`,
  };

  return explorers[blockchain] || `https://etherscan.io/tx/${txHash}`;
}
