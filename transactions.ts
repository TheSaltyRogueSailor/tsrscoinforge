import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { ethers } from "ethers";
import type { BlockchainType } from "./config";
import { RPC_ENDPOINTS } from "./blockchain";

/**
 * Prepare a Solana transaction for signing
 * Returns the transaction as base64 string that can be signed client-side
 */
export async function prepareSolanaTransaction(params: {
  fromPublicKey: string;
  toPublicKey: string;
  amountLamports: number;
  memo?: string;
}): Promise<string> {
  try {
    const connection = new Connection(RPC_ENDPOINTS.solana);
    const fromPubkey = new PublicKey(params.fromPublicKey);
    const toPubkey = new PublicKey(params.toPublicKey);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    // Create transaction
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: fromPubkey,
    });

    // Add transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: params.amountLamports,
      })
    );

    // Add memo if provided
    if (params.memo) {
      const memoProgram = new PublicKey("MemoSq4gDiYvstqh74rStV6ecJqz3RqDR5p4gJcgF3");
      transaction.add({
        keys: [{ pubkey: fromPubkey, isSigner: true, isWritable: false }],
        programId: memoProgram,
        data: Buffer.from(params.memo),
      });
    }

    // Return as base64 for client-side signing
    return transaction.serialize({ requireAllSignatures: false }).toString("base64");
  } catch (error) {
    console.error("Error preparing Solana transaction:", error);
    throw new Error("Failed to prepare Solana transaction");
  }
}

/**
 * Submit a signed Solana transaction
 */
export async function submitSolanaTransaction(signedTransactionBase64: string): Promise<string> {
  try {
    const connection = new Connection(RPC_ENDPOINTS.solana);
    const transaction = Transaction.from(Buffer.from(signedTransactionBase64, "base64"));

    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    return signature;
  } catch (error) {
    console.error("Error submitting Solana transaction:", error);
    throw new Error("Failed to submit Solana transaction");
  }
}

/**
 * Prepare an EVM transaction for signing
 * Returns transaction data that can be signed with ethers
 */
export async function prepareEVMTransaction(params: {
  fromAddress: string;
  toAddress: string;
  amountWei: string;
  blockchain: "ethereum" | "bsc" | "base" | "polygon" | "arbitrum" | "optimism";
  data?: string;
}): Promise<{
  to: string;
  from: string;
  value: string;
  data?: string;
  gasLimit: string;
  gasPrice: string;
  nonce: number;
  chainId: number;
}> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[params.blockchain]);

    // Get nonce
    const nonce = await provider.getTransactionCount(params.fromAddress);

    // Get gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: params.toAddress,
      from: params.fromAddress,
      value: params.amountWei,
      data: params.data,
    });

    // Get chain ID
    const network = await provider.getNetwork();

    return {
      to: params.toAddress,
      from: params.fromAddress,
      value: params.amountWei,
      data: params.data,
      gasLimit: ((gasEstimate * BigInt(120)) / BigInt(100)).toString(), // Add 20% buffer
      gasPrice: gasPrice.toString(),
      nonce,
      chainId: Number(network.chainId),
    };
  } catch (error) {
    console.error("Error preparing EVM transaction:", error);
    throw new Error(`Failed to prepare ${params.blockchain} transaction`);
  }
}

/**
 * Submit a signed EVM transaction
 */
export async function submitEVMTransaction(params: {
  signedTransaction: string;
  blockchain: "ethereum" | "bsc" | "base" | "polygon" | "arbitrum" | "optimism";
}): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[params.blockchain]);
    const response = await provider.broadcastTransaction(params.signedTransaction);
    await response.wait(1); // Wait for 1 confirmation
    return response.hash;
  } catch (error) {
    console.error("Error submitting EVM transaction:", error);
    throw new Error(`Failed to submit ${params.blockchain} transaction`);
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(
  txHash: string,
  blockchain: BlockchainType
): Promise<{
  status: "pending" | "confirmed" | "failed";
  confirmations: number;
  blockNumber?: number;
}> {
  try {
    if (blockchain === "solana") {
      const connection = new Connection(RPC_ENDPOINTS.solana);
      const status = await connection.getSignatureStatus(txHash);

      if (!status.value) {
        return { status: "pending", confirmations: 0 };
      }

      if (status.value.err) {
        return { status: "failed", confirmations: 0 };
      }

      return {
        status: "confirmed",
        confirmations: status.value.confirmations || 0,
      };
    } else {
      const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[blockchain]);
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return { status: "pending", confirmations: 0 };
      }

      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      return {
        status: receipt.status === 1 ? "confirmed" : "failed",
        confirmations,
        blockNumber: receipt.blockNumber,
      };
    }
  } catch (error) {
    console.error("Error getting transaction status:", error);
    throw new Error("Failed to get transaction status");
  }
}


