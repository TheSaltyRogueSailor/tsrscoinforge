import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { ethers } from "ethers";
import { RPC_ENDPOINTS } from "./blockchain";

/**
 * Solana Transaction Signing
 */
export async function createSolanaTransaction(params: {
  fromPublicKey: string;
  toPublicKey: string;
  lamports: number;
}) {
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(params.fromPublicKey),
        toPubkey: new PublicKey(params.toPublicKey),
        lamports: params.lamports,
      })
    );

    return {
      success: true,
      transaction: transaction.serialize({ requireAllSignatures: false }).toString("base64"),
      message: "Solana transaction created successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create Solana transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * EVM Transaction Signing
 */
export async function createEVMTransaction(params: {
  chain: "ethereum" | "bsc" | "base" | "polygon" | "arbitrum" | "optimism";
  fromAddress: string;
  toAddress: string;
  amount: string; // in wei
  gasLimit?: string;
}) {
  try {
    const rpcUrl = RPC_ENDPOINTS[params.chain];
    if (!rpcUrl) {
      throw new Error(`Unsupported chain: ${params.chain}`);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get current gas price
    const feeData = await provider.getFeeData();
    
    const transaction = {
      to: params.toAddress,
      from: params.fromAddress,
      value: params.amount,
      gasLimit: params.gasLimit || "21000",
      gasPrice: feeData.gasPrice?.toString(),
      chainId: getChainId(params.chain),
    };

    return {
      success: true,
      transaction,
      message: "EVM transaction created successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create EVM transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get chain ID for EVM chains
 */
function getChainId(chain: string): number {
  const chainIds: Record<string, number> = {
    ethereum: 1,
    bsc: 56,
    base: 8453,
    polygon: 137,
    arbitrum: 42161,
    optimism: 10,
  };
  return chainIds[chain] || 1;
}

/**
 * Sign Solana transaction with keypair
 */
export async function signSolanaTransaction(params: {
  transactionBase64: string;
  privateKey: string;
}) {
  try {
    const { Keypair } = await import("@solana/web3.js");
    
    // Decode transaction
    const transactionBuffer = Buffer.from(params.transactionBase64, "base64");
    const transaction = Transaction.from(transactionBuffer);

    // Create keypair from private key
    const keypair = Keypair.fromSecretKey(Buffer.from(params.privateKey, "base64"));

    // Sign transaction
    transaction.sign(keypair);

    return {
      success: true,
      signedTransaction: transaction.serialize().toString("base64"),
      message: "Solana transaction signed successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to sign Solana transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Sign EVM transaction with private key
 */
export async function signEVMTransaction(params: {
  transaction: any;
  privateKey: string;
}) {
  try {
    const wallet = new ethers.Wallet(params.privateKey);
    const signedTx = await wallet.signTransaction(params.transaction);

    return {
      success: true,
      signedTransaction: signedTx,
      message: "EVM transaction signed successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to sign EVM transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Submit signed transaction to blockchain
 */
export async function submitTransaction(params: {
  chain: string;
  signedTransaction: string;
  isSolana: boolean;
}) {
  try {
    if (params.isSolana) {
      const { Connection } = await import("@solana/web3.js");
      const connection = new Connection(RPC_ENDPOINTS.solana);
      const signature = await connection.sendRawTransaction(
        Buffer.from(params.signedTransaction, "base64")
      );
      return {
        success: true,
        txHash: signature,
        message: "Transaction submitted to Solana",
      };
    } else {
      const rpcUrl = RPC_ENDPOINTS[params.chain as keyof typeof RPC_ENDPOINTS];
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const response = await provider.send("eth_sendRawTransaction", [params.signedTransaction]);
      return {
        success: true,
        txHash: response,
        message: "Transaction submitted to EVM chain",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to submit transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
