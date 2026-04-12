import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

const FEE_WALLET = "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8";
const REQUIRED_FEE_LAMPORTS = 100_000_000; // 0.1 SOL
const DECIMALS = 9;
const MULTIPLIER = 1_000_000_000n;

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
      tokenDescription
    } = req.body ?? {};

    if (!creatorWallet || !feeSignature || !tokenName || !tokenSymbol || !tokenSupply) {
      return json(res, 400, { error: "Missing required fields" });
    }

    const connection = new Connection(rpcUrl, "confirmed");
    const payer = Keypair.fromSecretKey(bs58.decode(mintSecretKeyBase58));
    const creator = new PublicKey(String(creatorWallet).trim());

    const parsedTx = await connection.getParsedTransaction(String(feeSignature), {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed"
    });

    if (!parsedTx) {
      return json(res, 400, { error: "Fee transaction not found" });
    }

    const feeOk = feeWasPaid(parsedTx, String(creatorWallet).trim());

    if (!feeOk) {
      return json(res, 400, { error: "Required 0.1 SOL fee was not found in transaction" });
    }

    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      DECIMALS
    );

    const creatorAta = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      creator
    );

    const amount = parseSupply(String(tokenSupply));
    const mintSignature = await mintTo(
      connection,
      payer,
      mint,
      creatorAta.address,
      payer,
      amount
    );

    return json(res, 200, {
      ok: true,
      mintAddress: mint.toBase58(),
      mintSignature,
      creatorTokenAccount: creatorAta.address.toBase58(),
      tokenName: String(tokenName),
      tokenSymbol: String(tokenSymbol),
      tokenDescription: String(tokenDescription || "")
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);

    return json(res, 500, { error: message });
  }
}
