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
    <p id="resultCA"></p>
    <p id="resultFeeTx"></p>
    <p id="resultMintTx"></p>
    <p id="resultMetadataUri"></p>
    <img id="resultImage" style="max-width:200px; display:none; margin-top:12px;" />
  </div>
`

  <input id="tokenName" placeholder="Token Name" />
  <br /><br />

  <input id="tokenSymbol" placeholder="Token Symbol" maxlength="10" />
  <br /><br />

  <input id="tokenSupply" placeholder="Total Supply" type="number" min="1" />
  <br /><br />

  <button id="createCoin">Create Coin</button>
  <p id="createStatus"></p>

  <div id="coinResult" style="display:none; margin-top:16px;">
    <h3>Coin Created ✅</h3>
    <p id="resultName"></p>
    <p id="resultSymbol"></p>
    <p id="resultSupply"></p>
    <p id="resultCA"></p>
    <p id="resultFeeTx"></p>
    <p id="resultMintTx"></p>
  </div>
`

const connectBtn = document.getElementById("connectWallet") as HTMLButtonElement
const walletAddress = document.getElementById("walletAddress") as HTMLParagraphElement
const createBtn = document.getElementById("createCoin") as HTMLButtonElement
const createStatus = document.getElementById("createStatus") as HTMLParagraphElement

const coinResult = document.getElementById("coinResult") as HTMLDivElement
const resultName = document.getElementById("resultName") as HTMLParagraphElement
const resultSymbol = document.getElementById("resultSymbol") as HTMLParagraphElement
const resultSupply = document.getElementById("resultSupply") as HTMLParagraphElement
const resultCA = document.getElementById("resultCA") as HTMLParagraphElement
const resultFeeTx = document.getElementById("resultFeeTx") as HTMLParagraphElement
const resultMintTx = document.getElementById("resultMintTx") as HTMLParagraphElement
const resultMetadataUri = document.getElementById("resultMetadataUri") as HTMLParagraphElement
const resultImage = document.getElementById("resultImage") as HTMLImageElement
const RECEIVER = "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8"
const FEE_LAMPORTS = 50_000_000
const RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/VpKm0MUizuIShAsvvW2rJ"

let provider: any = null
let solanaWeb3: any = null
let connection: any = null

function getErrorMessage(err: any): string {
  if (!err) return "Unknown error"
  if (typeof err === "string") return err
  if (err.message) return err.message
  try {
    return JSON.stringify(err)
  } catch {
    return "Unknown error"
  }
}

function setBusy(isBusy: boolean) {
  connectBtn.disabled = isBusy
  createBtn.disabled = isBusy
}

async function ensureWallet() {
  provider = (window as any).solana

  if (!provider || !provider.isPhantom) {
    throw new Error("Phantom wallet not detected.")
  }

  const resp = await provider.connect()
  walletAddress.innerText = "Connected: " + resp.publicKey.toString()
  return resp.publicKey.toString()
}

async function ensureWeb3() {
  solanaWeb3 = (window as any).solanaWeb3

  if (!solanaWeb3) {
    throw new Error("Solana web3 not loaded.")
  }

  connection = new solanaWeb3.Connection(RPC_URL, "confirmed")
  return { solanaWeb3, connection }
}

async function payLaunchFee(userPublicKey: string) {
  const { solanaWeb3, connection } = await ensureWeb3()

  const transaction = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: new solanaWeb3.PublicKey(userPublicKey),
      toPubkey: new solanaWeb3.PublicKey(RECEIVER),
      lamports: FEE_LAMPORTS,
    })
  )

  const latestBlockhash = await connection.getLatestBlockhash("confirmed")
  transaction.recentBlockhash = latestBlockhash.blockhash
  transaction.feePayer = new solanaWeb3.PublicKey(userPublicKey)

  createStatus.innerText = "Waiting for Phantom confirmation for launch fee..."

  const result = await provider.signAndSendTransaction(transaction)
  const signature = typeof result === "string" ? result : result.signature

  createStatus.innerText = "Confirming launch fee on-chain..."

  const confirmation = await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed"
  )

  if (confirmation?.value?.err) {
    throw new Error("Launch fee transaction failed.")
  }

  return signature
}

async function requestRealMint(params: {
  tokenName: string
  tokenSymbol: string
  tokenSupply: string
  creatorWallet: string
  feeSignature: string
}) {
  createStatus.innerText = "Creating real token mint..."

  const response = await fetch("/api/create-coin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error || \`Mint API failed with status \${response.status}\`)
  }

  if (!data?.mintAddress) {
    throw new Error("Mint API did not return a mint address.")
  }

  return data
}

connectBtn.onclick = async () => {
  try {
    setBusy(true)
    await ensureWallet()
  } catch (err: any) {
    walletAddress.innerText = "Wallet connection failed: " + getErrorMessage(err)
  } finally {
    setBusy(false)
  }
}

createBtn.onclick = async () => {
  try {
    setBusy(true)
    coinResult.style.display = "none"
    createStatus.innerText = ""

    const tokenName = (document.getElementById("tokenName") as HTMLInputElement).value.trim()
    const tokenSymbol = (document.getElementById("tokenSymbol") as HTMLInputElement).value.trim().toUpperCase()
    const tokenSupply = (document.getElementById("tokenSupply") as HTMLInputElement).value.trim()

    if (!tokenName || !tokenSymbol || !tokenSupply) {
      createStatus.innerText = "Fill all fields."
      return
    }

    const parsedSupply = Number(tokenSupply)
    if (!Number.isFinite(parsedSupply) || parsedSupply <= 0) {
      createStatus.innerText = "Supply must be a valid number greater than 0."
      return
    }

    const creatorWallet = await ensureWallet()
    const feeSignature = await payLaunchFee(creatorWallet)

    const mintResult = await requestRealMint({
      tokenName,
      tokenSymbol,
      tokenSupply,
      creatorWallet,
      feeSignature,
    })

    const mintAddress = mintResult.mintAddress as string
    const mintTx = mintResult.signature as string | undefined

    createStatus.innerText = "Success. Real token created."

    resultName.innerText = \`Name: \${tokenName}\`
    resultSymbol.innerText = \`Symbol: \${tokenSymbol}\`
    resultSupply.innerText = \`Supply: \${tokenSupply}\`
    resultCA.innerHTML = \`CA / Mint Address: <b>\${mintAddress}</b>\`
    resultFeeTx.innerText = \`Launch Fee TX: \${feeSignature}\`
    resultMintTx.innerText = mintTx ? \`Mint TX: \${mintTx}\` : "Mint TX: Not returned"
    coinResult.style.display = "block"
  } catch (err: any) {
    console.error(err)
    createStatus.innerText = "Error: " + getErrorMessage(err)
  } finally {
    setBusy(false)
  }
}
