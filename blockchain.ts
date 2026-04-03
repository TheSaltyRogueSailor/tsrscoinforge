import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ethers } from "ethers";
import type { BlockchainType } from "./config";

// RPC Endpoints
export const RPC_ENDPOINTS: Record<BlockchainType, string> = {
  solana: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  ethereum: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
  bsc: process.env.BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org",
  base: process.env.BASE_RPC_URL || "https://mainnet.base.org",
  polygon: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
  arbitrum: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
  optimism: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
};

// Token decimals per chain
const TOKEN_DECIMALS: Record<BlockchainType, number> = {
  solana: 9,
  ethereum: 18,
  bsc: 18,
  base: 18,
  polygon: 18,
  arbitrum: 18,
  optimism: 18,
};

// Native token symbols
const NATIVE_TOKENS: Record<BlockchainType, string> = {
  solana: "SOL",
  ethereum: "ETH",
  bsc: "BNB",
  base: "ETH",
  polygon: "MATIC",
  arbitrum: "ETH",
  optimism: "ETH",
};

/**
 * Get Solana balance for a wallet address
 */
export async function getSolanaBalance(walletAddress: string): Promise<number> {
  try {
    const connection = new Connection(RPC_ENDPOINTS.solana);
    const publicKey = new PublicKey(walletAddress);
    const balanceLamports = await connection.getBalance(publicKey);
    return balanceLamports / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("Error fetching Solana balance:", error);
    throw new Error("Failed to fetch Solana balance");
  }
}

/**
 * Get EVM chain balance (Ethereum, BSC, Base, Polygon, Arbitrum, Optimism)
 */
export async function getEVMBalance(
  walletAddress: string,
  blockchain: "ethereum" | "bsc" | "base" | "polygon" | "arbitrum" | "optimism"
): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[blockchain]);
    const balanceWei = await provider.getBalance(walletAddress);
    return parseFloat(ethers.formatEther(balanceWei));
  } catch (error) {
    console.error(`Error fetching ${blockchain} balance:`, error);
    throw new Error(`Failed to fetch ${blockchain} balance`);
  }
}

/**
 * Get wallet balance for any supported blockchain
 */
export async function getWalletBalance(
  walletAddress: string,
  blockchain: BlockchainType
): Promise<{ balance: number; symbol: string }> {
  try {
    let balance: number;

    if (blockchain === "solana") {
      balance = await getSolanaBalance(walletAddress);
    } else {
      balance = await getEVMBalance(
        walletAddress,
        blockchain as "ethereum" | "bsc" | "base" | "polygon" | "arbitrum" | "optimism"
      );
    }

    return {
      balance,
      symbol: NATIVE_TOKENS[blockchain],
    };
  } catch (error) {
    console.error(`Error fetching balance for ${blockchain}:`, error);
    throw error;
  }
}

/**
 * Get current gas price for transaction estimation
 */
export async function getGasPrice(blockchain: BlockchainType): Promise<string> {
  try {
    if (blockchain === "solana") {
      // Solana uses fixed fee per transaction (5000 lamports default)
      return "5000";
    } else {
      const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[blockchain]);
      const feeData = await provider.getFeeData();
      return feeData.gasPrice?.toString() || "0";
    }
  } catch (error) {
    console.error(`Error fetching gas price for ${blockchain}:`, error);
    throw new Error(`Failed to fetch gas price for ${blockchain}`);
  }
}

/**
 * Verify wallet address format for blockchain
 */
export function isValidWalletAddress(address: string, blockchain: BlockchainType): boolean {
  try {
    if (blockchain === "solana") {
      new PublicKey(address);
      return true;
    } else {
      return ethers.isAddress(address);
    }
  } catch {
    return false;
  }
}

/**
 * Get blockchain explorer URL for transaction
 */
export function getExplorerUrl(txHash: string, blockchain: BlockchainType): string {
  const explorers: Record<BlockchainType, string> = {
    solana: `https://solscan.io/tx/${txHash}`,
    ethereum: `https://etherscan.io/tx/${txHash}`,
    bsc: `https://bscscan.com/tx/${txHash}`,
    base: `https://basescan.org/tx/${txHash}`,
    polygon: `https://polygonscan.com/tx/${txHash}`,
    arbitrum: `https://arbiscan.io/tx/${txHash}`,
    optimism: `https://optimistic.etherscan.io/tx/${txHash}`,
  };
  return explorers[blockchain];
}

/**
 * Get blockchain name for display
 */
export function getBlockchainName(blockchain: BlockchainType): string {
  const names: Record<BlockchainType, string> = {
    solana: "Solana",
    ethereum: "Ethereum",
    bsc: "Binance Smart Chain",
    base: "Base",
    polygon: "Polygon",
    arbitrum: "Arbitrum",
    optimism: "Optimism",
  };
  return names[blockchain];
}
