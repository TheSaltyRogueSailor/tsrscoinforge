import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction
} from "@solana/spl-token";
import {
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction
} from "@metaplex-foundation/mpl-token-metadata";
import bs58 from "bs58";

export const config = {
  runtime: "nodejs",
  maxDuration: 60
};

const DECIMALS = 9;

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function getConnection() {
  const rpc =
    process.env.ALCHEMY_RPC_URL ||
    process.env.RPC_URL ||
    clusterApiUrl("mainnet-beta");

  return new Connection(rpc, "confirmed");
}

function getMintAuthority() {
  const secret = process.env.MINT_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing MINT_SECRET_KEY");
  }

  try {
    const bytes = bs58.decode(secret);
    return Keypair.fromSecretKey(bytes);
  } catch {
    try {
      const arr = JSON.parse(secret);
      return Keypair.fromSecretKey(Uint8Array.from(arr));
    } catch {
      throw new Error("MINT_SECRET_KEY format invalid");
    }
  }
}

function normalizeImageUrl(req: any, imageUrl: string) {
  const raw = String(imageUrl || "").trim();
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const origin =
    req.headers.origin ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://tsrscoinforge.com";

  if (raw.startsWith("/")) {
    return `${origin}${raw}`;
  }

  return `${origin}/${raw}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const connection = getConnection();
    const payer = getMintAuthority();

    const {
      tokenName,
      tokenSymbol,
      tokenDescription,
      tokenSupply,
      imageUrl
    } = req.body || {};

    if (!tokenName || !tokenSymbol || !tokenSupply) {
      return json(res, 400, {
        error: "tokenName, tokenSymbol, and tokenSupply are required"
      });
    }

    const mintKeypair = Keypair.generate();
    const creator = payer.publicKey;
    const creatorAta = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      creator,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const amount = BigInt(String(tokenSupply));
    const lamports = await getMinimumBalanceForRentExemptMint(connection);

    const mintAddress = mintKeypair.publicKey.toBase58();
    const metadataUrl = `${
      req.headers.origin || "https://tsrscoinforge.com"
    }/api/metadata?mint=${mintAddress}&name=${encodeURIComponent(
      String(tokenName)
    )}&symbol=${encodeURIComponent(
      String(tokenSymbol)
    )}&description=${encodeURIComponent(
      String(tokenDescription || "")
    )}&supply=${encodeURIComponent(String(tokenSupply))}&image=${encodeURIComponent(
      normalizeImageUrl(req, String(imageUrl || ""))
    )}`;

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer()
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const tx = new Transaction();

    tx.add({
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true }
      ],
      programId: new PublicKey("11111111111111111111111111111111"),
      data: Buffer.alloc(0)
    });

    tx.instructions = [];

    tx.add(
      // create mint account
      (
        await import("@solana/web3.js")
      ).SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID
      })
    );

    tx.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        DECIMALS,
        payer.publicKey,
        payer.publicKey
      )
    );

    tx.add(
      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPda,
          mint: mintKeypair.publicKey,
          mintAuthority: payer.publicKey,
          payer: payer.publicKey,
          updateAuthority: payer.publicKey
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: String(tokenName).slice(0, 32),
              symbol: String(tokenSymbol).slice(0, 10),
              uri: metadataUrl,
              sellerFeeBasisPoints: 0,
              creators: [
                {
                  address: payer.publicKey,
                  verified: false,
                  share: 100
                }
              ],
              collection: null,
              uses: null
            },
            isMutable: true,
            collectionDetails: null
          }
        }
      )
    );

    tx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        creatorAta,
        creator,
        mintKeypair.publicKey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    tx.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        creatorAta,
        payer.publicKey,
        amount
      )
    );

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = latestBlockhash.blockhash;

    tx.sign(payer, mintKeypair);

    const mintSignature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "processed",
      maxRetries: 5
    });

    await connection.confirmTransaction(
      {
        signature: mintSignature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      },
      "confirmed"
    );

    return json(res, 200, {
      success: true,
      mintAddress,
      mintSignature,
      creatorTokenAccount: creatorAta.toBase58(),
      tokenName: String(tokenName),
      tokenSymbol: String(tokenSymbol),
      tokenDescription: String(tokenDescription || ""),
      metadataUrl
    });
  } catch (err: any) {
    return json(res, 500, { error: err.message || String(err) });
  }
}
