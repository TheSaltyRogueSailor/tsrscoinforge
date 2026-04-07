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

const button = document.getElementById("connectWallet") as HTMLButtonElement
const walletText = document.getElementById("walletAddress") as HTMLParagraphElement
const createCoinBtn = document.getElementById("createCoin") as HTMLButtonElement
const createStatus = document.getElementById("createStatus") as HTMLParagraphElement

const RECEIVER_WALLET = "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8"
const FEE_LAMPORTS = 10_000_000 // 0.01 SOL

button.onclick = async () => {
  try {
    const provider = (window as any).solana

    if (!provider || !provider.isPhantom) {
      alert("Open this inside Phantom browser.")
      return
    }

    const resp = await provider.connect()
    walletText.innerText = "Connected: " + resp.publicKey.toString()
  } catch (err: any) {
    walletText.innerText = "Error: " + (err?.message || "Wallet connection failed")
    console.error(err)
  }
}

createCoinBtn.onclick = async () => {
  try {
    const provider = (window as any).solana
    const solanaWeb3 = (window as any).solanaWeb3

    if (!provider || !provider.isPhantom) {
      alert("Open this inside Phantom browser.")
      return
    }

    if (!solanaWeb3) {
      createStatus.innerText = "Error: Solana web3 failed to load."
      return
    }

    const tokenName = (document.getElementById("tokenName") as HTMLInputElement).value.trim()
    const tokenSymbol = (document.getElementById("tokenSymbol") as HTMLInputElement).value.trim()
    const tokenSupply = (document.getElementById("tokenSupply") as HTMLInputElement).value.trim()

    if (!tokenName || !tokenSymbol || !tokenSupply) {
      createStatus.innerText = "Please fill in all fields."
      return
    }

    await provider.connect()

    createStatus.innerText = "Preparing payment..."

    const connection = new solanaWeb3.Connection(
      "https://solana-rpc.publicnode.com",
      "confirmed"
    )

    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: new solanaWeb3.PublicKey(RECEIVER_WALLET),
        lamports: FEE_LAMPORTS
      })
    )

    transaction.feePayer = provider.publicKey

    const { blockhash } = await connection.getLatestBlockhash("confirmed")
    transaction.recentBlockhash = blockhash

    const signed = await provider.signTransaction(transaction)
    const signature = await connection.sendRawTransaction(signed.serialize())

    createStatus.innerText = "Payment sent! TX: " + signature
  } catch (err: any) {
    createStatus.innerText = "Error: " + (err?.message || "Transaction failed")
    console.error(err)
  }
}
