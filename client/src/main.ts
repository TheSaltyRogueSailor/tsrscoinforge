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

  <textarea id="tokenDescription" placeholder="Coin Description"></textarea>
  <br /><br />

  <input id="tokenImage" type="file" />
  <br /><br />

  <button id="createCoin">Create Coin</button>
  <p id="createStatus"></p>
`;

const connectBtn = document.getElementById("connectWallet") as HTMLButtonElement;
const walletAddress = document.getElementById("walletAddress") as HTMLParagraphElement;
const createBtn = document.getElementById("createCoin") as HTMLButtonElement;
const createStatus = document.getElementById("createStatus") as HTMLParagraphElement;

function getErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return String(err);
}

connectBtn.onclick = async () => {
  try {
    const provider = (window as any).solana;

    if (!provider || !provider.isPhantom) {
      walletAddress.innerText = "Phantom wallet not found.";
      return;
    }

    const resp = await provider.connect();
    walletAddress.innerText = "Connected: " + resp.publicKey.toString();
  } catch (err) {
    walletAddress.innerText = "Wallet connection failed: " + getErrorMessage(err);
  }
};

createBtn.onclick = async () => {
  createStatus.innerText = "Create flow not reconnected yet.";
};
