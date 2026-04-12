async function sendLaunchFee() {
  const provider = (window as any).solana

  if (!provider || !provider.isPhantom) {
    alert("Phantom wallet not found")
    return false
  }

  const connection = new (window as any).solanaWeb3.Connection(
    "https://api.mainnet-beta.solana.com"
  )

  const fromPubkey = provider.publicKey
  const toPubkey = new (window as any).solanaWeb3.PublicKey(
    "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8"
  )

  const transaction = new (window as any).solanaWeb3.Transaction().add(
    (window as any).solanaWeb3.SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: 0.1 * (window as any).solanaWeb3.LAMPORTS_PER_SOL,
    })
  )

  transaction.feePayer = fromPubkey
  const { blockhash } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash

  try {
    const signed = await provider.signTransaction(transaction)
    const signature = await connection.sendRawTransaction(signed.serialize())
    await connection.confirmTransaction(signature)
    return true
  } catch (err) {
    console.error(err)
    alert("Payment failed")
    return false
  }
}

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

  <div id="coinResult" style="display:none; margin-top:16px;">
    <h3>Coin Created ✅</h3>
    <p id="resultName"></p>
    <p id="resultSymbol"></p>
    <p id="resultSupply"></p>
    <p id="resultCA"></p>
    <img id="resultImage" style="max-width:200px; display:none;" />
  </div>
`;

const provider = (window as any).solana

document.getElementById("connectWallet")?.addEventListener("click", async () => {
  if (!provider || !provider.isPhantom) {
    alert("Install Phantom")
    return
  }

  const res = await provider.connect()
  document.getElementById("walletAddress")!.innerText =
    "Connected: " + res.publicKey.toString()
})

document.getElementById("createCoin")?.addEventListener("click", async function sendLaunchFee() {
  try {
    const provider = (window as any).solana
    const solanaWeb3 = (window as any).solanaWeb3

    if (!provider || !provider.isPhantom) {
      alert("Phantom wallet not found")
      return false
    }

    if (!provider.publicKey) {
      await provider.connect()
    }

    const connection = new solanaWeb3.Connection(
      "https://api.mainnet-beta.solana.com",
      "confirmed"
    )

    const fromPubkey = provider.publicKey
    const toPubkey = new solanaWeb3.PublicKey(
      "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8"
    )

    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: Math.round(0.1 * solanaWeb3.LAMPORTS_PER_SOL),
      })
    )

    transaction.feePayer = fromPubkey

    const latestBlockhash = await connection.getLatestBlockhash()
    transaction.recentBlockhash = latestBlockhash.blockhash

    const result = await provider.signAndSendTransaction(transaction)

    await connection.confirmTransaction({
      signature: result.signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    })

    return true
  } catch (err) {
    console.error(err)
    alert("Payment failed: " + (err instanceof Error ? err.message : String(err)))
    return false
  }
}

  const name = (document.getElementById("tokenName") as HTMLInputElement).value
  const symbol = (document.getElementById("tokenSymbol") as HTMLInputElement).value
  const supply = (document.getElementById("tokenSupply") as HTMLInputElement).value
  const file = (document.getElementById("tokenImage") as HTMLInputElement).files?.[0]

  document.getElementById("createStatus")!.innerText =
    "Frontend working. Fee sent. Mint coming next."

  const fakeCA = Math.random().toString(36).substring(2, 44)

  document.getElementById("resultName")!.innerText = "Name: " + name
  document.getElementById("resultSymbol")!.innerText = "Symbol: " + symbol
  document.getElementById("resultSupply")!.innerText = "Supply: " + supply
  document.getElementById("resultCA")!.innerText = "CA: " + fakeCA

  if (file) {
    const img = document.getElementById("resultImage") as HTMLImageElement
    img.src = URL.createObjectURL(file)
    img.style.display = "block"
  }

  document.getElementById("coinResult")!.style.display = "block"
})
