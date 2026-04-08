<!DOCTYPE html>
<html>
<head>
  <title>TSRS Coin Forge 🚀</title>
  <script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.js"></script>
</head>

<body style="background:black;color:white;font-family:sans-serif;padding:20px">

<h1>TSRS Coin Forge 🚀</h1>

<button id="connectWallet">Connect Phantom Wallet</button>
<p id="walletAddress"></p>

<hr>

<h2>Create Coin</h2>

<input id="tokenName" placeholder="Token Name" /><br><br>
<input id="tokenSymbol" placeholder="Symbol" /><br><br>
<input id="tokenSupply" placeholder="Supply" /><br><br>

<button id="createCoin">Create Coin</button>

<p id="createStatus"></p>

<script>
const connectBtn = document.getElementById("connectWallet")
const walletAddress = document.getElementById("walletAddress")
const createBtn = document.getElementById("createCoin")
const createStatus = document.getElementById("createStatus")

const RECEIVER = "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8"
const FEE_LAMPORTS = 50000000

const RPC_URL = "https://solana-mainnet.g.alchemy.com/v2/VpKm0MUizuIShAsvvW2rJ"

const connection = new solanaWeb3.Connection(RPC_URL, "confirmed")

let provider = null

connectBtn.onclick = async () => {
  provider = window.solana

  if (!provider || !provider.isPhantom) {
    alert("Open inside Phantom browser")
    return
  }

  const resp = await provider.connect()
  walletAddress.innerText = "Connected: " + resp.publicKey.toString()
}

createBtn.onclick = async () => {
  try {
    if (!provider) return alert("Connect wallet first")

    const tokenName = document.getElementById("tokenName").value
    const tokenSymbol = document.getElementById("tokenSymbol").value
    const tokenSupply = document.getElementById("tokenSupply").value

    createStatus.innerText = "Processing payment..."

    const tx = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: new solanaWeb3.PublicKey(RECEIVER),
        lamports: FEE_LAMPORTS,
      })
    )

    const { blockhash } = await connection.getLatestBlockhash()
    tx.recentBlockhash = blockhash
    tx.feePayer = provider.publicKey

    const signed = await provider.signAndSendTransaction(tx)

    createStatus.innerText = "Confirming..."

    await connection.confirmTransaction(signed.signature, "confirmed")

    createStatus.innerHTML = `
    ✅ Payment sent!<br/>
    Name: ${tokenName}<br/>
    Symbol: ${tokenSymbol}<br/>
    Supply: ${tokenSupply}<br/>
    TX: ${signed.signature}
    `

  } catch (err) {
    console.error(err)
    createStatus.innerText = "Error: " + err.message
  }
}
</script>

</body>
</html>
