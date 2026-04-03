import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ENV } from "./_core/env";

// Solana network configuration
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || "mainnet-beta";
const SOLANA_RPC_URL =
  SOLANA_NETWORK === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : SOLANA_NETWORK === "testnet"
      ? "https://api.testnet.solana.com"
      : "https://api.devnet.solana.com";

// Vault address (receives all fees)
const VAULT_ADDRESS = process.env.SOLANA_VAULT_ADDRESS;

if (!VAULT_ADDRESS) {
  console.warn("[Solana] SOLANA_VAULT_ADDRESS not configured");
}

// Create Solana connection
export const getSolanaConnection = () => {
  return new Connection(SOLANA_RPC_URL, "confirmed");
};

/**
 * Get vault balance in SOL
 */
export const getVaultBalance = async (): Promise<number> => {
  if (!VAULT_ADDRESS) {
    console.warn("[Solana] Vault address not configured");
    return 0;
  }

  try {
    const connection = getSolanaConnection();
    const vaultPubkey = new PublicKey(VAULT_ADDRESS);
    const balance = await connection.getBalance(vaultPubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("[Solana] Failed to get vault balance:", error);
    return 0;
  }
};

/**
 * Get recent transactions to vault
 */
export const getVaultTransactions = async (limit: number = 50) => {
  if (!VAULT_ADDRESS) {
    console.warn("[Solana] Vault address not configured");
    return [];
  }

  try {
    const connection = getSolanaConnection();
    const vaultPubkey = new PublicKey(VAULT_ADDRESS);

    // Get signatures for the vault address
    const signatures = await connection.getSignaturesForAddress(vaultPubkey, {
      limit,
    });

    // Get transaction details
    const transactions = await Promise.all(
      signatures.map(async (sig: any) => {
        try {
          const tx: any = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          return {
            signature: sig.signature,
            timestamp: sig.blockTime || Date.now() / 1000,
            status: sig.err ? "failed" : "success",
            amount: tx?.transaction.message.instructions[0] ? "N/A" : "0",
          };
        } catch (e) {
          return null;
        }
      })
    );

    return transactions.filter((tx) => tx !== null);
  } catch (error) {
    console.error("[Solana] Failed to get vault transactions:", error);
    return [];
  }
};

/**
 * Validate Solana address format
 */
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get wallet balance in SOL
 */
export const getWalletBalance = async (publicKey: string): Promise<number> => {
  try {
    const connection = getSolanaConnection();
    const pubkey = new PublicKey(publicKey);
    const balance = await connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("[Solana] Failed to get wallet balance:", error);
    return 0;
  }
};

/**
 * Get wallet balance in lamports
 */
export const getWalletBalanceLamports = async (publicKey: string): Promise<number> => {
  try {
    const connection = getSolanaConnection();
    const pubkey = new PublicKey(publicKey);
    return await connection.getBalance(pubkey);
  } catch (error) {
    console.error("[Solana] Failed to get wallet balance:", error);
    return 0;
  }
};

/**
 * Get SOL price in USD
 */
export const getSolPrice = async (): Promise<number> => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.error("[Solana] Failed to get SOL price:", error);
    return 150; // Default estimate
  }
};

/**
 * Convert SOL to USD
 */
export const solToUsd = async (sol: number): Promise<number> => {
  const price = await getSolPrice();
  return sol * price;
};

/**
 * Convert USD to SOL
 */
export const usdToSol = async (usd: number): Promise<number> => {
  const price = await getSolPrice();
  return usd / price;
};

/**
 * Get Solana network info
 */
export const getSolanaNetworkInfo = () => {
  return {
    network: SOLANA_NETWORK,
    rpcUrl: SOLANA_RPC_URL,
    vaultAddress: VAULT_ADDRESS || "Not configured",
  };
};

export default {
  getSolanaConnection,
  getVaultBalance,
  getVaultTransactions,
  isValidSolanaAddress,
  getSolanaNetworkInfo,
  getWalletBalance,
  getWalletBalanceLamports,
  getSolPrice,
  solToUsd,
  usdToSol,
};
