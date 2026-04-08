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

// Your private Alchemy Solana mainnet RPC
const RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/VpKm0MUizuIShAsvvW2rJ"

let provider: any = null
let solanaWeb3: any = null
let connection: any = null

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForSignature(signature: string) {
  // Poll for up to ~60 seconds without throwing fake timeout errors
  for (let i = 0; i < 20; i++) {
    const response = await connection.getSignatureStatuses([signature])
    const status = response?.value?.[0]

    if (status) {
      if (status.err) {
        throw new Error("Transaction failed on-chain.")
      }

      if (
        status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized"
      ) {
        return "confirmed"
      }
    }

    await sleep(3000)
  }

  return "submitted"
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
      "Wallet connection failed: " + (err?.message || "Unknown error")
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

    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: new solanaWeb3.PublicKey(RECEIVER),
        lamports: FEE_LAMPORTS,
      })
    )

    const latestBlockhash = await connection.getLatestBlockhash("confirmed")
    transaction.recentBlockhash = latestBlockhash.blockhash
    transaction.feePayer = provider.publicKey

    createStatus.innerText = "Waiting for Phantom confirmation..."

    const result = await provider.signAndSendTransaction(transaction)
    const signature =
      typeof result === "string" ? result : result.signature

    createStatus.innerText = "Processing payment..."

    const finalStatus = await waitForSignature(signature)

    if (finalStatus === "confirmed") {
      createStatus.innerHTML = `
✅ Payment sent!<br />
Token Name: ${tokenName}<br />
Symbol: ${tokenSymbol}<br />
Supply: ${tokenSupply}<br />
TX: ${signature}
`
    } else {
      createStatus.innerHTML = `
🟡 Payment submitted and still confirming.<br />
Token Name: ${tokenName}<br />
Symbol: ${tokenSymbol}<br />
Supply: ${tokenSupply}<br />
TX: ${signature}
`
    }
  } catch (err: any) {
    console.error(err)
    createStatus.innerText =
      "Error: " + (err?.message || JSON.stringify(err))
  }
      }
