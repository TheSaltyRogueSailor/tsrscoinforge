import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import bs58 from "bs58";

const FEE_WALLET = "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8";
const REQUIRED_FEE_LAMPORTS = 100_000_000; // 0.1 SOL
const DECIMALS = 9;
const MULTIPLIER = 1_000_000_000n;
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function parseSupply(raw: string): bigint {
  const trimmed = String(raw).trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new Error("tokenSupply must be a whole number");
  }

  const whole = BigInt(trimmed);

  if (whole <= 0n) {
    throw new Error("tokenSupply must be greater than 0");
  }

  return whole * MULTIPLIER;
}

function feeWasPaid(parsedTx: any, creatorWallet: string): boolean {
  if (!parsedTx?.transaction?.message?.instructions) return false;

  for (const ix of parsedTx.transaction.message.instructions) {
    const parsed = ix?.parsed;
    if (!parsed) continue;
    if (ix.program !== "system") continue;
    if (parsed.type !== "transfer") continue;

    const info = parsed.info;
    const from = String(info?.source || info?.from || "");
    const to = String(info?.destination || info?.to || "");
    const lamports = Number(info?.lamports || 0);

    if (
      from === creatorWallet &&
      to === FEE_WALLET &&
      lamports >= REQUIRED_FEE_LAMPORTS
    ) {
      return true;
    }
  }

  return false;
}

async function waitForParsedTransaction(connection: Connection, signature: string) {
  for (let i = 0; i < 15; i++) {
    const parsedTx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (parsedTx) {
      return parsedTx;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return null;
}

function isRetriableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  return (
    lower.includes("block height exceeded") ||
    lower.includes("signature has expired") ||
    lower.includes("blockhash not found") ||
    lower.includes("transaction expired")
  );
}

async function sendTx(
  connection: Connection,
  payer: Keypair,
  instructions: any[],
  extraSigners: Keypair[] = []
): Promise<{ signature: string; blockhash: string; lastValidBlockHeight: number }> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({
    feePayer: payer.publicKey,
    recentBlockhash: blockhash,
  });

  for (const ix of instructions) {
    tx.add(ix);
  }

  tx.sign(payer, ...extraSigners);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    maxRetries: 5,
  });

  return { signature, blockhash, lastValidBlockHeight };
}

async function confirmTx(
  connection: Connection,
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number
) {
  await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    "confirmed"
  );
}

async function createMintWithFreshKeypair(
  connection: Connection,
  payer: Keypair
): Promise<{ mintKeypair: Keypair; createMintSignature: string }> {
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);

  for (let i = 0; i < 5; i++) {
    const mintKeypair = Keypair.generate();

    try {
      const { signature, blockhash, lastValidBlockHeight } = await sendTx(
        connection,
        payer,
        [
          SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: mintRent,
            programId: TOKEN_PROGRAM_ID,
          }),
          createInitializeMintInstruction(
            mintKeypair.publicKey,
            DECIMALS,
            payer.publicKey,
            payer.publicKey
          ),
        ],
        [mintKeypair]
      );

      await confirmTx(connection, signature, blockhash, lastValidBlockHeight);

      return { mintKeypair, createMintSignature: signature };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (!isRetriableError(err) && !message.toLowerCase().includes("already in use")) {
        throw err;
      }
    }
  }

  throw new Error("Failed to create mint after retries");
}

async function ensureAta(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey
): Promise<{ ata: PublicKey; createAtaSignature: string | null }> {
  const ata = await getAssociatedTokenAddress(
    mint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const existing = await connection.getAccountInfo(ata, "confirmed");
  if (existing) {
    return { ata, createAtaSignature: null };
  }

  for (let i = 0; i < 5; i++) {
    try {
      const { signature, blockhash, lastValidBlockHeight } = await sendTx(
        connection,
        payer,
        [
          createAssociatedTokenAccountInstruction(
            payer.publicKey,
            ata,
            owner,
            mint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          ),
        ]
      );

      await confirmTx(connection, signature, blockhash, lastValidBlockHeight);

      return { ata, createAtaSignature: signature };
    } catch (err) {
      const existingAfter = await connection.getAccountInfo(ata, "confirmed");
      if (existingAfter) {
        return { ata, createAtaSignature: null };
      }

      if (!isRetriableError(err)) {
        throw err;
      }
    }
  }

  throw new Error("Failed to create associated token account after retries");
}

async function mintToWithRetry(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  destinationAta: PublicKey,
  amount: bigint
): Promise<string> {
  for (let i = 0; i < 5; i++) {
    try {
      const { signature, blockhash, lastValidBlockHeight } = await sendTx(
        connection,
        payer,
        [
          createMintToInstruction(
            mint,
            destinationAta,
            payer.publicKey,
            amount,
            [],
            TOKEN_PROGRAM_ID
          ),
        ]
      );

      await confirmTx(connection, signature, blockhash, lastValidBlockHeight);

      return signature;
    } catch (err) {
      if (!isRetriableError(err)) {
        throw err;
      }
    }
  }

  throw new Error("Failed to mint tokens after retries");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const rpcUrl = getEnv("ALCHEMY_RPC_URL");
    const mintSecretKeyBase58 = getEnv("MINT_SECRET_KEY");

    const {
      creatorWallet,
      feeSignature,
      tokenName,
      tokenSymbol,
      tokenSupply,
      tokenDescription,
    } = req.body ?? {};

    if (!creatorWallet || !feeSignature || !tokenName || !tokenSymbol || !tokenSupply) {
      return json(res, 400, { error: "Missing required fields" });
    }

    const connection = new Connection(rpcUrl, "confirmed");
    const payer = Keypair.fromSecretKey(bs58.decode(mintSecretKeyBase58));
    const creator = new PublicKey(String(creatorWallet).trim());

    const parsedTx = await waitForParsedTransaction(connection, String(feeSignature));

    if (!parsedTx) {
      return json(res, 400, { error: "Fee transaction not found after waiting" });
    }

    const feeOk = feeWasPaid(parsedTx, String(creatorWallet).trim());

    if (!feeOk) {
      return json(res, 400, { error: "Required 0.1 SOL fee was not found in transaction" });
    }

    const { mintKeypair, createMintSignature } = await createMintWithFreshKeypair(
      connection,
      payer
    );

    const { ata, createAtaSignature } = await ensureAta(
      connection,
      payer,
      mintKeypair.publicKey,
      creator
    );

    const amount = parseSupply(String(tokenSupply));

    const mintSignature = await mintToWithRetry(
      connection,
      payer,
      mintKeypair.publicKey,
      ata,
      amount
    );

    return json(res, 200, {
      ok: true,
      mintAddress: mintKeypair.publicKey.toBase58(),
      mintSignature,
      createMintSignature,
      createAtaSignature,
      creatorTokenAccount: ata.toBase58(),
      tokenName: String(tokenName),
      tokenSymbol: String(tokenSymbol),
      tokenDescription: String(tokenDescription || ""),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(res, 500, { error: message });
  }
}
