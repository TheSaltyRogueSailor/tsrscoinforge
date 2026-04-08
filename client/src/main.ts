import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";

import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createInitializeMint2Instruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";

document.body.innerHTML = `
  <h1>TSRS Coin Forge 🚀</h1>
  <p>Frontend is LIVE</p>

  <button id="connectWallet">Connect Phantom Wallet</button>
  <p id="walletAddress"></p>

  <hr />

  <h2>Create Coin</h2>

  <input id="tokenName" placeholder="Token Name" />
  <br /><br />

  <input id="tokenSymbol" placeholder="Token Symbol" />
  <br /><br />

  <input id="tokenSupply" placeholder="Total Supply" />
  <br /><br />

  <button id="createCoin">Create Coin</button>
  <p id="createStatus"></p>
`;

const connectBtn = document.getElementById("connectWallet") as HTMLButtonElement;
const walletAddress = document.getElementById("walletAddress") as HTMLParagraphElement;
const createBtn = document.getElementById("createCoin") as HTMLButtonElement;
const createStatus = document.getElementById("createStatus") as HTMLParagraphElement;

const RECEIVER = new PublicKey("9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8");
const FEE_LAMPORTS = 50_000_000; // 0.05 SOL
const DECIMALS = 9;
const RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/VpKm0MUizuIShAsvvW2rJ";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  signAndSendTransaction: (tx: Transaction) => Promise<string | { signature: string }>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
};

let provider: PhantomProvider | null = null;

function getProvider(): PhantomProvider | null {
  return (window as any).solana ?? null;
}

function uiError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

connectBtn.onclick = async () => {
  try {
    provider = getProvider();

    if (!provider || !provider.isPhantom) {
      alert("Open this site inside Phantom browser.");
      return;
    }

    const resp = await provider.connect();
    walletAddress.innerText = "Connected: " + resp.publicKey.toString();
  } catch (err) {
    walletAddress.innerText = "Wallet connection failed: " + uiError(err);
  }
};

createBtn.onclick = async () => {
  try {
    provider = getProvider();

    if (!provider || !provider.isPhantom) {
      createStatus.innerText = "Open this site inside Phantom browser.";
      return;
    }

    const tokenName = (document.getElementById("tokenName") as HTMLInputElement).value.trim();
    const tokenSymbol = (document.getElementById("tokenSymbol") as HTMLInputElement).value.trim();
    const tokenSupplyRaw = (document.getElementById("tokenSupply") as HTMLInputElement).value.trim();

    if (!tokenName || !tokenSymbol || !tokenSupplyRaw) {
      createStatus.innerText = "Fill all fields.";
      return;
    }

    if (!/^\d+$/.test(tokenSupplyRaw)) {
      createStatus.innerText = "Supply must be a whole number.";
      return;
    }

    const wholeSupply = BigInt(tokenSupplyRaw);
    if (wholeSupply <= 0n) {
      createStatus.innerText = "Supply must be greater than zero.";
      return;
    }

    await provider.connect();
    if (!provider.publicKey) {
      createStatus.innerText = "Wallet not connected.";
      return;
    }

    const connection = new Connection(RPC_URL, "confirmed");

    // 1) Collect fee
    createStatus.innerText = "Waiting for Phantom fee confirmation...";

    const feeTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: RECEIVER,
        lamports: FEE_LAMPORTS,
      })
    );

    const feeBlockhash = await connection.getLatestBlockhash("confirmed");
    feeTx.recentBlockhash = feeBlockhash.blockhash;
    feeTx.feePayer = provider.publicKey;

    const feeResult = await provider.signAndSendTransaction(feeTx);
    const feeSignature =
      typeof feeResult === "string" ? feeResult : feeResult.signature;

    await connection.confirmTransaction(
      {
        signature: feeSignature,
        blockhash: feeBlockhash.blockhash,
        lastValidBlockHeight: feeBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    // 2) Create mint + ATA + mint supply
    createStatus.innerText = "Creating token...";

    const mintKeypair = Keypair.generate();
    const rentLamports = await getMinimumBalanceForRentExemptMint(connection);

    const ata = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      provider.publicKey
    );

    const mintTx = new Transaction().add(
      // Create mint account
      SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: rentLamports,
        programId: TOKEN_PROGRAM_ID,
      }),

      // Initialize mint
      createInitializeMint2Instruction(
        mintKeypair.publicKey,
        DECIMALS,
        provider.publicKey,
        provider.publicKey
      ),

      // Create user's associated token account
      createAssociatedTokenAccountInstruction(
        provider.publicKey, // payer
        ata,                // ata
        provider.publicKey, // owner
        mintKeypair.publicKey
      ),

      // Mint supply to user
      createMintToInstruction(
        mintKeypair.publicKey,
        ata,
        provider.publicKey,
        wholeSupply * 10n ** BigInt(DECIMALS)
      )
    );

    const mintBlockhash = await connection.getLatestBlockhash("confirmed");
    mintTx.recentBlockhash = mintBlockhash.blockhash;
    mintTx.feePayer = provider.publicKey;

    // First signer = mint account
    mintTx.partialSign(mintKeypair);

    // Second signer = Phantom wallet
    const signedMintTx = await provider.signTransaction(mintTx);
    const mintSignature = await connection.sendRawTransaction(signedMintTx.serialize());

    await connection.confirmTransaction(
      {
        signature: mintSignature,
        blockhash: mintBlockhash.blockhash,
        lastValidBlockHeight: mintBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    createStatus.innerHTML = `
✅ Payment sent!<br />
✅ Token created!<br />
Token Name: ${tokenName}<br />
Symbol: ${tokenSymbol}<br />
Supply: ${tokenSupplyRaw}<br />
Decimals: ${DECIMALS}<br />
Mint Address: ${mintKeypair.publicKey.toString()}<br />
Token Account: ${ata.toString()}<br />
Fee TX: ${feeSignature}<br />
Mint TX: ${mintSignature}
`;
  } catch (err) {
    console.error(err);
    createStatus.innerText = "Error: " + uiError(err);
  }
};
