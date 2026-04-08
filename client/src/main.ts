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
`

const connectBtn = document.getElementById("connectWallet") as HTMLButtonElement
const walletAddress = document.getElementById("walletAddress") as HTMLParagraphElement
const createBtn = document.getElementById("createCoin") as HTMLButtonElement
const createStatus = document.getElementById("createStatus") as HTMLParagraphElement

const RECEIVER = "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8"
const FEE_LAMPORTS = 50000000 // 0.05 SOL
const RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/VpKm0MUizuIShAsvvW2rJ"

let provider: any = null
let solanaWeb3: any = null
let connection: any = null

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

async function checkSignatureStatus(signature: string) {
  const response = await connection.getSignatureStatuses([signature])
  return response?.value?.[0] ?? null
}

async function confirmOrRetry(signature: string, latestBlockhash: any) {
  try {
    await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    )
    return "confirmed"
  } catch (err: any) {
    const status = await checkSignatureStatus(signature)

    if (
      status &&
      (status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized")
    ) {
      return "confirmed"
    }

    const msg = getErrorMessage(err).toLowerCase()

    if (
      msg.includes("block height exceeded") ||
      msg.includes("expired") ||
      msg.includes("not confirmed in 30.00 seconds")
    ) {
      return "retry"
    }

    throw err
  }
}

async function sendFeeTransaction(tokenName: string, tokenSymbol: string, tokenSupply: string) {
  let lastSignature = ""

  for (let attempt = 1; attempt <= 2; attempt++) {
    createStatus.innerText =
      attempt === 1
        ? "Waiting for Phantom confirmation..."
        : "Retrying payment with fresh blockhash..."

    const latestBlockhash = await connection.getLatestBlockhash("confirmed")

    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: new solanaWeb3.PublicKey(RECEIVER),
        lamports: FEE_LAMPORTS,
      })
    )

    transaction.recentBlockhash = latestBlockhash.blockhash
    transaction.feePayer = provider.publicKey

    const result = await provider.signAndSendTransaction(transaction)
    const signature =
      typeof result === "string" ? result : result.signature

    lastSignature = signature

    createStatus.innerText =
      attempt === 1 ? "Confirming payment..." : "Confirming retried payment..."

    const outcome = await confirmOrRetry(signature, latestBlockhash)

    if (outcome === "confirmed") {
      createStatus.innerHTML = `
✅ Payment sent!<br />
Token Name: ${tokenName}<br />
Symbol: ${tokenSymbol}<br />
Supply: ${tokenSupply}<br />
TX: ${signature}
`
      return
    }

    await sleep(1200)
  }

  createStatus.innerHTML = `
🟡 Payment submitted but final confirmation timed out.<br />
Token Name: ${tokenName}<br />
Symbol: ${tokenSymbol}<br />
Supply: ${tokenSupply}<br />
TX: ${lastSignature}
`
}

connectBtn.onclick = async () => {
  try {
    provider = (window as any).solana

    if (!provider || !provider.isPhantom) {
      alert("Open this site inside Phantom browser.")
      return
    }

    const resp = await provider.connect()
    walletAddress.innerText = "Connected: " + resp.publicKey.toString()
  } catch (err: any) {
    walletAddress.innerText =
      "Wallet connection failed: " + getErrorMessage(err)
  }
}

createBtn.onclick = async () => {
  try {
    provider = (window as any).solana
    solanaWeb3 = (window as any).solanaWeb3

    if (!provider || !provider.isPhantom) {
      createStatus.innerText = "Open this site inside Phantom browser."
      return
    }

    if (!solanaWeb3) {
      createStatus.innerText = "Solana web3 not loaded."
      return
    }

    const tokenName = (document.getElementById("tokenName") as HTMLInputElement).value.trim()
    const tokenSymbol = (document.getElementById("tokenSymbol") as HTMLInputElement).value.trim()
    const tokenSupply = (document.getElementById("tokenSupply") as HTMLInputElement).value.trim()

    if (!tokenName || !tokenSymbol || !tokenSupply) {
      createStatus.innerText = "Fill all fields."
      return
    }

    await provider.connect()
    connection = new solanaWeb3.Connection(RPC_URL, "confirmed")

    await sendFeeTransaction(tokenName, tokenSymbol, tokenSupply)
  } catch (err: any) {
    console.error(err)
    createStatus.innerText = "Error: " + getErrorMessage(err)
  }
}
