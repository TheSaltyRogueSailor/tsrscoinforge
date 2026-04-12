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

function isExpiredError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  return (
    lower.includes("block height exceeded") ||
    lower.includes("signature has expired") ||
    lower.includes("blockhash not found") ||
    lower.includes("transaction expired")
  );
}

async function sendTxWithRetry(
  connection: Connection,
  payer: Keypair,
  instructions: any[],
  extraSigners: Keypair[] = [],
  attempts = 5
): Promise<string> {
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
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

      await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      return signature;
    } catch (err) {
      lastErr = err;

      if (!isExpiredError(err) || i === attempts - 1) {
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  throw lastErr;
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

    const mintKeypair = Keypair.generate();
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);

    const createMintSignature = await sendTxWithRetry(
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

    const creatorAta = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      creator,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const createAtaSignature = await sendTxWithRetry(
      connection,
      payer,
      [
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          creatorAta,
          creator,
          mintKeypair.publicKey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        ),
      ]
    );

    const amount = parseSupply(String(tokenSupply));

    const mintToSignature = await sendTxWithRetry(
      connection,
      payer,
      [
        createMintToInstruction(
          mintKeypair.publicKey,
          creatorAta,
          payer.publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID
        ),
      ]
    );

    return json(res, 200, {
      ok: true,
      mintAddress: mintKeypair.publicKey.toBase58(),
      mintSignature: mintToSignature,
      createMintSignature,
      createAtaSignature,
      creatorTokenAccount: creatorAta.toBase58(),
      tokenName: String(tokenName),
      tokenSymbol: String(tokenSymbol),
      tokenDescription: String(tokenDescription || ""),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(res, 500, { error: message });
  }
}
