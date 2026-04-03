import { TRPCError } from "@trpc/server";
import type { BlockchainType } from "./config";
import { getCreationFeeUSD, getBlockchainConfig } from "./config";
import { prepareSolanaTransaction, prepareEVMTransaction } from "./transactions";

// USD to crypto conversion rates (in production, use live price feeds)
const USD_TO_CRYPTO: Record<BlockchainType, number> = {
  solana: 0.025, // 1 SOL = $25 (example)
  ethereum: 0.0005, // 1 ETH = $2000 (example)
  bsc: 0.0003, // 1 BNB = $3000 (example)
  base: 0.0005, // 1 ETH = $2000 (example)
  polygon: 0.0001, // 1 MATIC = $10000 (example)
  arbitrum: 0.0005, // 1 ETH = $2000 (example)
  optimism: 0.0005, // 1 ETH = $2000 (example)
};

/**
 * Get creation fee in cryptocurrency for a blockchain
 */
export function getCreationFeeInCrypto(blockchain: BlockchainType): {
  amountUSD: number;
  amountCrypto: number;
  symbol: string;
} {
  const amountUSD = getCreationFeeUSD(blockchain);
  const amountCrypto = amountUSD * USD_TO_CRYPTO[blockchain];

  const symbols: Record<BlockchainType, string> = {
    solana: "SOL",
    ethereum: "ETH",
    bsc: "BNB",
    base: "ETH",
    polygon: "MATIC",
    arbitrum: "ETH",
    optimism: "ETH",
  };

  return {
    amountUSD,
    amountCrypto,
    symbol: symbols[blockchain],
  };
}

/**
 * Prepare payment for coin creation
 * Returns transaction data ready for user signing
 */
export async function prepareCreationPayment(params: {
  userWalletAddress: string;
  vaultAddress: string;
  blockchain: BlockchainType;
  tokenSymbol: string;
}): Promise<{
  transactionData: string | object;
  amountUSD: number;
  amountCrypto: number;
  symbol: string;
  blockchain: BlockchainType;
  memo: string;
}> {
  try {
    // Get fee amount
    const fee = getCreationFeeInCrypto(params.blockchain);

    // Prepare transaction based on blockchain
    let transactionData: string | object;
    const memo = `TSRS Coin Creation: ${params.tokenSymbol}`;

    if (params.blockchain === "solana") {
      // Convert to lamports
      const amountLamports = Math.floor(fee.amountCrypto * 1_000_000_000);

      transactionData = await prepareSolanaTransaction({
        fromPublicKey: params.userWalletAddress,
        toPublicKey: params.vaultAddress,
        amountLamports,
        memo,
      });
    } else {
      // EVM chains
      const amountWei = BigInt(Math.floor(fee.amountCrypto * 1e18)).toString();

      transactionData = await prepareEVMTransaction({
        fromAddress: params.userWalletAddress,
        toAddress: params.vaultAddress,
        amountWei,
        blockchain: params.blockchain as any,
      });
    }

    return {
      transactionData,
      amountUSD: fee.amountUSD,
      amountCrypto: fee.amountCrypto,
      symbol: fee.symbol,
      blockchain: params.blockchain,
      memo,
    };
  } catch (error) {
    console.error("Error preparing creation payment:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to prepare payment transaction",
    });
  }
}

/**
 * Validate payment was received
 * In production, this would check blockchain confirmation
 */
export async function validatePaymentReceived(params: {
  transactionHash: string;
  blockchain: BlockchainType;
  expectedAmount: number;
  vaultAddress: string;
}): Promise<boolean> {
  try {
    // TODO: Implement blockchain verification
    // For now, return true (in production, verify on blockchain)
    console.log(
      `Payment validation for ${params.transactionHash} on ${params.blockchain} - TODO: Implement blockchain verification`
    );
    return true;
  } catch (error) {
    console.error("Error validating payment:", error);
    return false;
  }
}

/**
 * Calculate total cost including gas fees
 */
export function calculateTotalCost(params: {
  blockchain: BlockchainType;
  gasEstimate?: number;
}): {
  creationFeeUSD: number;
  gasFeeUSD: number;
  totalUSD: number;
} {
  const creationFeeUSD = getCreationFeeUSD(params.blockchain);

  // Estimate gas cost (varies by blockchain)
  const gasFeeUSD = params.gasEstimate || getEstimatedGasCost(params.blockchain);

  return {
    creationFeeUSD,
    gasFeeUSD,
    totalUSD: creationFeeUSD + gasFeeUSD,
  };
}

/**
 * Get estimated gas cost for a blockchain
 */
function getEstimatedGasCost(blockchain: BlockchainType): number {
  const estimatedGasCosts: Record<BlockchainType, number> = {
    solana: 0.00025, // ~$0.0025
    ethereum: 5, // ~$5
    bsc: 0.5, // ~$0.50
    base: 1, // ~$1
    polygon: 0.1, // ~$0.10
    arbitrum: 0.5, // ~$0.50
    optimism: 1, // ~$1
  };

  return estimatedGasCosts[blockchain];
}

/**
 * Format payment display
 */
export function formatPaymentDisplay(params: {
  amountCrypto: number;
  symbol: string;
  amountUSD: number;
}): string {
  return `${params.amountCrypto.toFixed(6)} ${params.symbol} (~$${params.amountUSD.toFixed(2)})`;
}
