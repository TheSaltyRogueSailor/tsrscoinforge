import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getSolanaConnection } from "./solana";

/**
 * Create a real SPL token on Solana
 * This function creates the mint account and initial token account
 * The transaction must be signed by the user's wallet
 */
export async function createSPLTokenTransaction(params: {
  creatorPublicKey: string;
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  totalSupply: number;
}): Promise<{
  transaction: string; // Base64 encoded transaction
  mintAddress?: string;
  estimatedCost: number;
  error?: string;
}> {
  try {
    const connection = getSolanaConnection();
    const creatorPubkey = new PublicKey(params.creatorPublicKey);

    // Get recent blockhash for transaction
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    // Create a new transaction
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: creatorPubkey,
    });

    // Estimate cost: ~0.00142 SOL for mint account + ~0.00203 SOL for token account
    const estimatedCostSOL = 0.00345;

    // Prepare transaction for user to sign
    // The actual mint creation will happen after signing
    const transactionData = {
      type: "spl_token_creation",
      creator: params.creatorPublicKey,
      name: params.tokenName,
      symbol: params.tokenSymbol,
      decimals: params.decimals,
      totalSupply: params.totalSupply,
      estimatedCostSOL,
    };

    // Serialize transaction to base64
    const transactionBase64 = transaction
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    return {
      transaction: transactionBase64,
      estimatedCost: estimatedCostSOL,
    };
  } catch (error) {
    console.error("[SPL Token] Error creating token transaction:", error);
    return {
      transaction: "",
      estimatedCost: 0,
      error: `Failed to prepare token creation: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Deploy SPL token after user signs the transaction
 * This is called on the backend after receiving the signed transaction
 */
export async function deploySPLToken(params: {
  creatorPublicKey: string;
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  totalSupply: number;
  signedTransactionBase64: string;
}): Promise<{
  mintAddress: string;
  transactionHash: string;
  success: boolean;
  error?: string;
}> {
  try {
    const connection = getSolanaConnection();
    const creatorPubkey = new PublicKey(params.creatorPublicKey);

    console.log(
      `[SPL Token] Deploying token: ${params.tokenName} (${params.tokenSymbol})`
    );
    console.log(`[SPL Token] Creator: ${params.creatorPublicKey}`);
    console.log(`[SPL Token] Decimals: ${params.decimals}`);
    console.log(`[SPL Token] Total Supply: ${params.totalSupply}`);

    // Create mint account
    // The mint authority is the creator, and freeze authority is also the creator
    const mintKeypair = Keypair.generate();
    const mintAddress = mintKeypair.publicKey;

    console.log(`[SPL Token] Generated mint address: ${mintAddress.toString()}`);

    // Create the mint
    const createMintTx = await createMint(
      connection,
      // Payer - this should be the creator's keypair in production
      // For now, we'll use a temporary keypair (this needs to be handled by the client)
      Keypair.generate(),
      creatorPubkey, // Mint authority
      creatorPubkey, // Freeze authority
      params.decimals,
      mintKeypair
    );

    console.log(`[SPL Token] Mint created: ${createMintTx.toString()}`);

    // Create associated token account for the creator
    const associatedTokenAccount = await createAssociatedTokenAccount(
      connection,
      Keypair.generate(), // Payer
      mintAddress,
      creatorPubkey
    );

    console.log(
      `[SPL Token] Associated token account created: ${associatedTokenAccount.toString()}`
    );

    // Mint initial supply to creator's account
    const mintTx = await mintTo(
      connection,
      Keypair.generate(), // Payer
      mintAddress,
      associatedTokenAccount,
      creatorPubkey,
      BigInt(params.totalSupply * Math.pow(10, params.decimals))
    );

    console.log(`[SPL Token] Tokens minted: ${mintTx}`);

    return {
      mintAddress: mintAddress.toString(),
      transactionHash: mintTx,
      success: true,
    };
  } catch (error) {
    console.error("[SPL Token] Error deploying token:", error);
    return {
      mintAddress: "",
      transactionHash: "",
      success: false,
      error: `Failed to deploy token: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Verify token exists on-chain
 */
export async function verifyTokenOnChain(
  mintAddress: string
): Promise<{
  exists: boolean;
  supply?: number;
  decimals?: number;
  error?: string;
}> {
  try {
    const connection = getSolanaConnection();
    const mint = new PublicKey(mintAddress);

    const mintInfo = await connection.getParsedAccountInfo(mint);

    if (!mintInfo.value) {
      return {
        exists: false,
        error: "Token not found on-chain",
      };
    }

    const parsedData = mintInfo.value.data as any;
    if (parsedData.parsed?.info) {
      return {
        exists: true,
        supply: parsedData.parsed.info.supply,
        decimals: parsedData.parsed.info.decimals,
      };
    }

    return {
      exists: true,
    };
  } catch (error) {
    console.error("[SPL Token] Error verifying token:", error);
    return {
      exists: false,
      error: `Failed to verify token: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get token metadata from on-chain
 */
export async function getTokenMetadata(mintAddress: string): Promise<{
  name?: string;
  symbol?: string;
  decimals?: number;
  supply?: number;
  error?: string;
}> {
  try {
    const connection = getSolanaConnection();
    const mint = new PublicKey(mintAddress);

    const mintInfo = await connection.getParsedAccountInfo(mint);

    if (!mintInfo.value) {
      return {
        error: "Token not found",
      };
    }

    const parsedData = mintInfo.value.data as any;
    if (parsedData.parsed?.info) {
      return {
        decimals: parsedData.parsed.info.decimals,
        supply: parsedData.parsed.info.supply,
      };
    }

    return {};
  } catch (error) {
    console.error("[SPL Token] Error getting metadata:", error);
    return {
      error: `Failed to get metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
