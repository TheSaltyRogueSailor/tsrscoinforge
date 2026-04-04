import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";

export interface TokenCreationParams {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  creatorPublicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  network?: "devnet" | "testnet" | "mainnet-beta";
}

export interface TokenCreationResult {
  success: boolean;
  mintAddress?: string;
  transactionSignatures?: string[];
  error?: string;
}

/**
 * Create SPL token on Solana using user's wallet
 * This is fully client-side and user-signed
 */
export async function createSPLTokenClientSide(
  params: TokenCreationParams
): Promise<TokenCreationResult> {
  try {
    const network = params.network || "devnet";
    const endpoint = clusterApiUrl(network);
    const connection = new Connection(endpoint, "confirmed");

    console.log(`[SPL Token Creation] Starting token creation on ${network}`);
    console.log(`[SPL Token Creation] Token: ${params.name} (${params.symbol})`);
    console.log(`[SPL Token Creation] Creator: ${params.creatorPublicKey.toString()}`);

    const transactionSignatures: string[] = [];

    // Step 1: Create mint account keypair
    console.log("[SPL Token Creation] Step 1: Creating mint account...");
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    console.log(`[SPL Token Creation] Mint address: ${mint.toString()}`);

    // Step 2: Get rent for mint account
    const lamports = await getMinimumBalanceForRentExemptMint(connection);

    // Step 3: Get recent blockhash
    let { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    // Step 4: Create mint account and initialize mint
    console.log("[SPL Token Creation] Creating mint account transaction...");

    const createMintTx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: params.creatorPublicKey,
    });

    // Add instruction to create account
    createMintTx.add(
      SystemProgram.createAccount({
        fromPubkey: params.creatorPublicKey,
        newAccountPubkey: mint,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // Add instruction to initialize mint
    createMintTx.add(
      createInitializeMintInstruction(
        mint,
        params.decimals,
        params.creatorPublicKey, // Mint authority
        params.creatorPublicKey, // Freeze authority
        TOKEN_PROGRAM_ID
      )
    );

    // Add mint keypair as signer
    createMintTx.sign(mintKeypair);

    // Step 5: User signs the transaction
    console.log("[SPL Token Creation] Waiting for user to sign mint creation...");
    const signedMintTx = await params.signTransaction(createMintTx);

    // Step 6: Send mint creation transaction
    console.log("[SPL Token Creation] Sending mint creation transaction...");
    const mintTxSignature = await connection.sendRawTransaction(
      signedMintTx.serialize()
    );
    transactionSignatures.push(mintTxSignature);
    console.log(`[SPL Token Creation] Mint tx signature: ${mintTxSignature}`);

    // Wait for confirmation
    await connection.confirmTransaction({
      signature: mintTxSignature,
      blockhash,
      lastValidBlockHeight,
    });

    console.log("[SPL Token Creation] Mint created successfully");

    // Step 7: Create associated token account
    console.log("[SPL Token Creation] Step 2: Creating associated token account...");

    const associatedTokenAccount = new PublicKey(
      await getAssociatedTokenAddress(
        mint,
        params.creatorPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    console.log(
      `[SPL Token Creation] Associated token account: ${associatedTokenAccount.toString()}`
    );

    // Step 8: Create ATA transaction
    const { blockhash: blockhash2, lastValidBlockHeight: lastValidBlockHeight2 } =
      await connection.getLatestBlockhash("confirmed");

    const createAtaTx = new Transaction({
      recentBlockhash: blockhash2,
      feePayer: params.creatorPublicKey,
    });

    createAtaTx.add(
      createAssociatedTokenAccountInstruction(
        params.creatorPublicKey,
        associatedTokenAccount,
        params.creatorPublicKey,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    console.log("[SPL Token Creation] Waiting for user to sign ATA creation...");
    const signedAtaTx = await params.signTransaction(createAtaTx);

    console.log("[SPL Token Creation] Sending ATA creation transaction...");
    const ataTxSignature = await connection.sendRawTransaction(
      signedAtaTx.serialize()
    );
    transactionSignatures.push(ataTxSignature);
    console.log(`[SPL Token Creation] ATA tx signature: ${ataTxSignature}`);

    await connection.confirmTransaction({
      signature: ataTxSignature,
      blockhash: blockhash2,
      lastValidBlockHeight: lastValidBlockHeight2,
    });

    console.log("[SPL Token Creation] ATA created successfully");

    // Step 9: Mint tokens to the associated account
    console.log("[SPL Token Creation] Step 3: Minting tokens...");

    const { blockhash: blockhash3, lastValidBlockHeight: lastValidBlockHeight3 } =
      await connection.getLatestBlockhash("confirmed");

    const mintTokensTx = new Transaction({
      recentBlockhash: blockhash3,
      feePayer: params.creatorPublicKey,
    });

    mintTokensTx.add(
      createMintToInstruction(
        mint,
        associatedTokenAccount,
        params.creatorPublicKey,
        BigInt(params.totalSupply * Math.pow(10, params.decimals)),
        [],
        TOKEN_PROGRAM_ID
      )
    );

    console.log("[SPL Token Creation] Waiting for user to sign mint transaction...");
    const signedMintTokensTx = await params.signTransaction(mintTokensTx);

    console.log("[SPL Token Creation] Sending mint transaction...");
    const mintTokensTxSignature = await connection.sendRawTransaction(
      signedMintTokensTx.serialize()
    );
    transactionSignatures.push(mintTokensTxSignature);
    console.log(`[SPL Token Creation] Mint tokens tx signature: ${mintTokensTxSignature}`);

    // Wait for confirmation
    await connection.confirmTransaction({
      signature: mintTokensTxSignature,
      blockhash: blockhash3,
      lastValidBlockHeight: lastValidBlockHeight3,
    });

    console.log("[SPL Token Creation] Tokens minted successfully");

    // Step 10: Verify token on-chain
    console.log("[SPL Token Creation] Verifying token on-chain...");
    const mintInfo = await connection.getParsedAccountInfo(mint);

    if (!mintInfo.value) {
      throw new Error("Failed to verify token on-chain");
    }

    console.log("[SPL Token Creation] Token verified on-chain");

    return {
      success: true,
      mintAddress: mint.toString(),
      transactionSignatures,
    };
  } catch (error) {
    console.error("[SPL Token Creation] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get associated token address
 */
async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve: boolean,
  programId: PublicKey,
  associatedTokenProgramId: PublicKey
): Promise<PublicKey> {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId
  );
  return address;
}

/**
 * Get token info from on-chain
 */
export async function getTokenInfo(
  mintAddress: string,
  network: "devnet" | "testnet" | "mainnet-beta" = "devnet"
): Promise<{
  decimals?: number;
  supply?: string;
  owner?: string;
  error?: string;
}> {
  try {
    const endpoint = clusterApiUrl(network);
    const connection = new Connection(endpoint, "confirmed");
    const mint = new PublicKey(mintAddress);

    const mintInfo = await connection.getParsedAccountInfo(mint);

    if (!mintInfo.value) {
      return { error: "Token not found" };
    }

    const data = mintInfo.value.data as any;
    if (data.parsed?.info) {
      return {
        decimals: data.parsed.info.decimals,
        supply: data.parsed.info.supply,
        owner: data.parsed.info.owner,
      };
    }

    return {};
  } catch (error) {
    console.error("[Token Info] Error:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
