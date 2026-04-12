document.body.innerHTML = `
  <h1>TSRS Coin Forge 🚀</h1>
  <p>Frontend is LIVE</p>

  <button id="connectWallet">Connect Phantom Wallet</button>
  <p id="walletAddress"></p>

  <hr />

  <h2>Create Coin</h2>

  <input id="tokenName" placeholder="Token Name" />
  <br /><br />

  <input id="tokenSymbol" placeholder="Token Symbol" maxlength="10" />
  <br /><br />

  <input id="tokenSupply" placeholder="Total Supply" type="number" min="1" />
  <br /><br />

  <textarea id="tokenDescription" placeholder="Coin Description" rows="4" cols="50"></textarea>
  <br /><br />

  <label for="tokenImage">Coin Image:</label>
  <input id="tokenImage" type="file" accept="image/*" />
  <br /><br />

  <button id="createCoin">Create Coin</button>
  <p id="createStatus"></p>

  <div id="coinResult" style="display:none; margin-top:16px;">
    <h3>Coin Created ✅</h3>
    <p id="resultName"></p>
    <p id="resultSymbol"></p>
    <p id="resultSupply"></p>
    <p id="resultDescription"></p>
    <p id="resultCA"></p>
    <p id="resultFeeTx"></p>
    <img id="resultImage" style="max-width:200px; display:none; margin-top:12px;" />
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
const resultImage = document.getElementById("resultImage") as HTMLImageElement;

function getErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return String(err);
}

function fakeCA(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 44; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
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
  const solanaWeb3 = (window as any).solanaWeb3;

  if (!solanaWeb3) {
    throw new Error("solanaWeb3 not loaded.");
  }

  const connection = new solanaWeb3.Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed"
  );

  const latestBlockhash = await connection.getLatestBlockhash();

  const transaction = new solanaWeb3.Transaction({
    feePayer: provider.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
  }).add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: new solanaWeb3.PublicKey(
        "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8"
      ),
      lamports: Math.round(0.1 * solanaWeb3.LAMPORTS_PER_SOL),
    })
  );

  const result = await provider.signAndSendTransaction(transaction);

  await connection.confirmTransaction({
    signature: result.signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  });

  return result.signature as string;
}

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

    createStatus.innerText = "Waiting for 0.1 SOL launch fee approval...";

    const feeSignature = await sendLaunchFee();

    createStatus.innerText = "Fee paid. Backend mint not connected yet.";

    resultName.innerText = "Name: " + tokenName;
    resultSymbol.innerText = "Symbol: " + tokenSymbol;
    resultSupply.innerText = "Supply: " + tokenSupply;
    resultDescription.innerText = "Description: " + tokenDescription;
    resultCA.innerText = "CA / Mint Address: " + fakeCA();
    resultFeeTx.innerText = "Launch Fee Tx: " + feeSignature;

    const imageUrl = URL.createObjectURL(imageFile);
    resultImage.src = imageUrl;
    resultImage.style.display = "block";

    coinResult.style.display = "block";
  } catch (err) {
    createStatus.innerText = "Create failed: " + getErrorMessage(err);
    coinResult.style.display = "none";
  }
};
