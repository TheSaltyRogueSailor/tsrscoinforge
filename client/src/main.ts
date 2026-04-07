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

const button = document.getElementById("connectWallet")!
const walletText = document.getElementById("walletAddress")!
const createCoinBtn = document.getElementById("createCoin")!
const createStatus = document.getElementById("createStatus")!

// 🔥 YOUR WALLET (RECEIVES FEES)
const RECEIVER_WALLET = "9kkjHiAYFryfFVuWfBY9XuvrEVd"

button.onclick = async () => {
  const provider = (window as any).solana

  if (!provider || !provider.isPhantom) {
    alert("Phantom Wallet not found. Install it.")
    return
  }

  const resp = await provider.connect()
  walletText.innerText = "Connected: " + resp.publicKey.toString()
}

createCoinBtn.onclick = async () => {
  const provider = (window as any).solana

  if (!provider || !provider.isPhantom) {
    alert("Phantom Wallet not found")
    return
  }

  await provider.connect()

  const connection = new (window as any).solanaWeb3.Connection(
    "https://api.mainnet-beta.solana.com"
  )

  const transaction = new (window as any).solanaWeb3.Transaction().add(
    (window as any).solanaWeb3.SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: new (window as any).solanaWeb3.PublicKey(RECEIVER_WALLET),
      lamports: 0.01 * 1000000000 // 💰 0.01 SOL fee
    })
  )

  transaction.feePayer = provider.publicKey

  const { blockhash } = await connection.getRecentBlockhash()
  transaction.recentBlockhash = blockhash

  const signed = await provider.signTransaction(transaction)
  const signature = await connection.sendRawTransaction(signed.serialize())

  createStatus.innerText = "✅ Payment sent! TX: " + signature

  // 👇 Optional: show what user entered
  const tokenName = (document.getElementById("tokenName") as HTMLInputElement).value
  const tokenSymbol = (document.getElementById("tokenSymbol") as HTMLInputElement).value
  const tokenSupply = (document.getElementById("tokenSupply") as HTMLInputElement).value

  console.log("Coin Request:", tokenName, tokenSymbol, tokenSupply)
}
