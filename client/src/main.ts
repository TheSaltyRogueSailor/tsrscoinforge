import logoImage from "./assets/TSRSCOIN.FORGE logo.png";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";

const ALCHEMY_RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/VpKm0MUizuIShAsvvW2rJ";
const FEE_WALLET = "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8";
const LAUNCH_FEE_SOL = 0.05;

document.body.innerHTML = `
  <div style="min-height:100vh; background:#0b1020; color:#f8fafc; font-family:Arial,sans-serif; padding:32px;">
    <div style="max-width:1100px; margin:0 auto;">

    <div style="display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:32px;">
        <div style="display:flex; align-items:center; gap:16px;">
  <img src="${logoImage}" alt="TSRS Coin Forge" style="width:88px; height:88px; object-fit:contain; border-radius:16px;" />
  <div>
<h1 style="margin:0; font-size:clamp(32px, 8vw, 40px); line-height:1.05;">TSRS Coin Forge ⚓</h1>
    <p style="margin:8px 0 0 0; color:#94a3b8; font-size:16px;">
      Launch Solana tokens with real minting, live feed, and instant proof links.
    </p>
  </div>
</div>

        <div style="text-align:right;">
  <button id="connectWallet" style="background:#2563eb; color:white; border:none; padding:12px 18px; border-radius:12px; font-weight:bold; font-size:16px; cursor:pointer; width:100%; max-width:340px;">      
            Connect Phantom Wallet
          </button>
          <p id="walletAddress" style="margin:10px 0 0 0; color:#cbd5e1; font-size:14px;"></p>
        </div>
      </div>

      <div style="background:linear-gradient(135deg,#111827,#1e293b); border:1px solid #334155; border-radius:20px; padding:28px; margin-bottom:28px;">
        <h2 style="margin:0 0 12px 0; font-size:28px;">Create Your Coin</h2>
        <p style="margin:0 0 24px 0; color:#94a3b8;">
          Create a real Solana token from TSRS Coin Forge. Launch fee: 0.05 SOL paid on launch.
        </p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
          <div>
            <label style="display:block; margin-bottom:8px; color:#cbd5e1;">Token Name</label>
            <input id="tokenName" placeholder="Token Name" style="width:100%; padding:12px; border-radius:10px; border:1px solid #475569; background:#0f172a; color:white;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:8px; color:#cbd5e1;">Token Symbol</label>
            <input id="tokenSymbol" placeholder="Token Symbol" maxlength="10" style="width:100%; padding:12px; border-radius:10px; border:1px solid #475569; background:#0f172a; color:white;" />
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
          <div>
            <label style="display:block; margin-bottom:8px; color:#cbd5e1;">Total Supply</label>
            <input id="tokenSupply" placeholder="Total Supply" type="number" min="1" style="width:100%; padding:12px; border-radius:10px; border:1px solid #475569; background:#0f172a; color:white;" />
          </div>
          <div>
            <label style="display:block; margin-bottom:8px; color:#cbd5e1;">Coin Image</label>
     <input id="tokenImage" type="file" accept="image/*" style="width:100%; padding:10px; border-radius:10px; border:1px solid #475569; background:#0f172a; color:#cbd5e1; overflow:hidden;" />
          </div>
        </div>

        <div style="margin-bottom:20px;">
          <label style="display:block; margin-bottom:8px; color:#cbd5e1;">Description</label>
<textarea id="tokenDescription" placeholder="Coin Description" rows="4" cols="50" style="width:100%; padding:12px; border-radius:10px; border:1px solid #475569; background:#0f172a; color:#f8fafc; resize:vertical;"></textarea>
        </div>

        <button id="createCoin" style="background:#16a34a; color:white; border:none; padding:14px 22px; border-radius:12px; font-weight:bold; font-size:16px; cursor:pointer;">
          Create Coin • Pay 0.05 SOL
        </button>
        <p id="createStatus" style="margin-top:14px; color:#fbbf24; font-size:14px;"></p>
      <p style="margin-top:10px; color:#94a3b8; font-size:13px;">
  Launch fee is paid directly to TSRS Coin Forge. Mint proof and launch history are saved automatically.
</p>

      </div>

      <div id="coinResult" style="display:none; background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid #334155; border-radius:20px; padding:24px; margin-bottom:28px; box-shadow:0 10px 30px rgba(0,0,0,0.25);">
      <h3 style="margin:0 0 10px 0; font-size:24px; color:#f8fafc;">Coin Created ✅</h3>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:18px; align-items:start;">
          <div>
            <p id="resultName" style="margin:0 0 10px 0; color:#e2e8f0;"></p>
            <p id="resultSymbol" style="margin:0 0 10px 0; color:#e2e8f0;"></p>
            <p id="resultSupply" style="margin:0 0 10px 0; color:#e2e8f0;"></p>
            <p id="resultDescription" style="margin:0 0 10px 0; color:#e2e8f0;"></p>
            <p id="resultCA" style="margin:0 0 10px 0; color:#e2e8f0; word-break:break-all;"></p>
            <p id="resultFeeTx" style="margin:0 0 10px 0; color:#e2e8f0; word-break:break-all;"></p>
            <p id="resultMintTx" style="margin:0 0 10px 0; color:#e2e8f0; word-break:break-all;"></p>
          </div>

          <div style="text-align:center;">
        <img id="resultImage" style="max-width:220px; width:100%; display:none; margin:0 auto; border-radius:18px; border:1px solid #334155;" />
          </div>
        </div>
      </div>

      <div style="background:#111827; border:1px solid #334155; border-radius:20px; padding:24px;">
        <h2 style="margin-top:0; font-size:28px;">Recent Launches</h2>
        <div id="recentLaunches"></div>
      </div>

    </div>
  </div>
`;

const connectBtn = document.getElementById("connectWallet") as HTMLButtonElement;
const walletAddress = document.getElementById("walletAddress") as HTMLParagraphElement;
const createBtn = document.getElementById("createCoin") as HTMLButtonElement;
const createStatus = document.getElementById("createStatus") as HTMLParagraphElement;

const coinResult = document.getElementById("coinResult") as HTMLDivElement;
const resultName = document.getElementById("resultName") as HTMLParagraphElement;
const resultSymbol = document.getElementById("resultSymbol") as HTMLParagraphElement;
const resultSupply = document.getElementById("resultSupply") as HTMLParagraphElement;
const resultDescription = document.getElementById("resultDescription") as HTMLParagraphElement;
const resultCA = document.getElementById("resultCA") as HTMLParagraphElement;
const resultFeeTx = document.getElementById("resultFeeTx") as HTMLParagraphElement;
const resultMintTx = document.getElementById("resultMintTx") as HTMLParagraphElement;
const resultImage = document.getElementById("resultImage") as HTMLImageElement;

function getErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return String(err);
}

async function ensurePhantom() {
  const provider = (window as any).solana;

  if (!provider || !provider.isPhantom) {
    throw new Error("Phantom wallet not found.");
  }

  if (!provider.publicKey) {
    await provider.connect();
  }

  return provider;
}

async function sendLaunchFee(): Promise<string> {
  const provider = await ensurePhantom();

  const connection = new Connection(ALCHEMY_RPC_URL, "confirmed");
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    feePayer: provider.publicKey,
    recentBlockhash: latestBlockhash.blockhash
  }).add(
    SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: new PublicKey(FEE_WALLET),
      lamports: Math.round(LAUNCH_FEE_SOL * LAMPORTS_PER_SOL)
    })
  );

  const signedTransaction = await provider.signTransaction(transaction);

  const signature = await connection.sendRawTransaction(
    signedTransaction.serialize(),
    {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 5
    }
  );

  return signature;
}

async function loadRecentLaunches() {
  const recentLaunches = document.getElementById("recentLaunches") as HTMLDivElement;
  if (!recentLaunches) return;

  const res = await fetch("/api/launches");
  const data = await res.json();

  const launches = data.launches || [];

  if (!launches.length) {
    recentLaunches.innerHTML = "<p>No launches yet.</p>";
    return;
  }

  recentLaunches.innerHTML = launches
    .map((launch: any) => {
      const tokenUrl = `https://solscan.io/token/${launch.mintAddress}`;
      const txUrl = `https://solscan.io/tx/${launch.mintSignature}`;

      return `
  <div style="background:linear-gradient(135deg,#0f172a,#1e293b); border:1px solid #334155; border-radius:18px; padding:18px; margin-bottom:16px; box-shadow:0 10px 25px rgba(0,0,0,0.18);">
    <div style="display:grid; grid-template-columns:1fr 180px; gap:18px; align-items:start;">
      <div>
        <p style="margin:0 0 8px 0; color:#e2e8f0;"><strong>Name:</strong> ${launch.tokenName}</p>
        <p style="margin:0 0 8px 0; color:#e2e8f0;"><strong>Symbol:</strong> ${launch.tokenSymbol}</p>
        <p style="margin:0 0 8px 0; color:#e2e8f0;"><strong>Supply:</strong> ${launch.tokenSupply}</p>
        <p style="margin:0 0 8px 0; color:#e2e8f0;"><strong>Description:</strong> ${launch.tokenDescription}</p>
  <p style="margin:0 0 12px 0; color:#e2e8f0; word-break:break-all;"><strong>Metadata:</strong> ${launch.metadataUrl ? `<a href="${launch.metadataUrl}" target="_blank" style="color:#38bdf8; text-decoration:none;">View metadata</a>` : "Not saved yet"}</p>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <a href="${tokenUrl}" target="_blank" style="text-decoration:none; background:#2563eb; color:white; padding:10px 14px; border-radius:10px; font-weight:bold; font-size:14px;">
            🔍 View Token
          </a>
          <a href="${txUrl}" target="_blank" style="text-decoration:none; background:#16a34a; color:white; padding:10px 14px; border-radius:10px; font-weight:bold; font-size:14px;">
            📄 View Mint Tx
          </a>
        </div>

       <p style="margin-top:14px; font-size:12px; color:#94a3b8;"><strong>Created:</strong> ${launch.createdAt}</p>
      </div>

      <div style="text-align:center;">
        ${
          launch.imageUrl
 <img src="${launch.imageUrl}" style="max-width:140px; width:100%; border-radius:16px; border:1px solid #334155;" />  
            : ""
        }
      </div>
    </div>
  </div>
`;
    })
    .join("");
}

loadRecentLaunches();

connectBtn.onclick = async () => {
  try {
    const provider = await ensurePhantom();
    walletAddress.innerText = "Connected: " + provider.publicKey.toString();
  } catch (err) {
    walletAddress.innerText = "Wallet connection failed: " + getErrorMessage(err);
  }
};

createBtn.onclick = async () => {
  try {
    const provider = await ensurePhantom();
    walletAddress.innerText = "Connected: " + provider.publicKey.toString();

    const tokenName = (document.getElementById("tokenName") as HTMLInputElement).value.trim();
    const tokenSymbol = (document.getElementById("tokenSymbol") as HTMLInputElement).value.trim().toUpperCase();
    const tokenSupply = (document.getElementById("tokenSupply") as HTMLInputElement).value.trim();
    const tokenDescription = (document.getElementById("tokenDescription") as HTMLTextAreaElement).value.trim();
    const tokenImageInput = document.getElementById("tokenImage") as HTMLInputElement;
    const imageFile = tokenImageInput.files?.[0];

    if (!tokenName || !tokenSymbol || !tokenSupply || !tokenDescription) {
      createStatus.innerText = "Fill all fields.";
      coinResult.style.display = "none";
      return;
    }

    if (!imageFile) {
      createStatus.innerText = "Upload a coin image.";
      coinResult.style.display = "none";
      return;
    }

    createStatus.innerText = "Approve the 0.05 SOL launch fee in Phantom to continue...";

    const feeSignature = await sendLaunchFee();

    if (!feeSignature) {
      throw new Error("Launch fee was not completed.");
    }

    createStatus.innerText = "Launch fee confirmed. Minting your real Solana token now...";

    const mintRes = await fetch("/api/mint-real", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        creatorWallet: provider.publicKey.toString(),
        feeSignature,
        tokenName,
        tokenSymbol,
        tokenSupply,
        tokenDescription
      })
    });

    const mintText = await mintRes.text();

    let mintData: any;
    try {
      mintData = JSON.parse(mintText);
    } catch {
      throw new Error("Backend error: " + mintText);
    }

    if (!mintRes.ok) {
      throw new Error(mintData?.error || "Mint failed");
    }

   createStatus.innerText = "Launch complete. Your real Solana token is live and saved to launch history.";

    resultName.innerText = "Name: " + tokenName;
    resultSymbol.innerText = "Symbol: " + tokenSymbol;
    resultSupply.innerText = "Supply: " + tokenSupply;
    resultDescription.innerText = "Description: " + tokenDescription;
    resultCA.innerText = "CA / Mint Address: " + mintData.mintAddress;
    resultFeeTx.innerText = "Launch Fee Tx: " + feeSignature.slice(0, 12) + "..." + feeSignature.slice(-12);
   resultMintTx.innerText = "Mint Tx: " + mintData.mintSignature.slice(0, 12) + "..." + mintData.mintSignature.slice(-12) + "\nMetadata saved";

    const solscanMint = `https://solscan.io/token/${mintData.mintAddress}`;
    const solscanTx = `https://solscan.io/tx/${mintData.mintSignature}`;

    const solscanLinks = document.createElement("div");
    solscanLinks.innerHTML = `
      <br/><br/>
  <a href="${solscanTx}" target="_blank" style="display:inline-block; margin-top:8px; padding:10px 14px; background:#22c55e; color:white; text-decoration:none; border-radius:10px; font-weight:bold;">📄 View Mint Transaction</a>    
    `;

    const oldLinks = coinResult.querySelector(".solscan-links");
    if (oldLinks) oldLinks.remove();
    solscanLinks.className = "solscan-links";

    const imageUrl = URL.createObjectURL(imageFile);
    resultImage.src = imageUrl;
    resultImage.style.display = "block";

    await fetch("/api/launches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
      tokenName,
tokenSymbol,
tokenDescription,
tokenSupply,
mintAddress: mintData.mintAddress,
mintSignature: mintData.mintSignature,
feeSignature,
imageUrl,
metadataUrl: mintData.metadataUrl || ""

      })
    });

    await loadRecentLaunches();

    coinResult.appendChild(solscanLinks);
    coinResult.style.display = "block";
  } catch (err) {
    createStatus.innerText = "Create failed: " + getErrorMessage(err);
    coinResult.style.display = "none";
  }
};
