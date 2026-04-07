document.body.innerHTML = `
  <h1>TSRS Coin Forge 🚀</h1>
  <p>Frontend is LIVE</p>

  <button id="connectWallet">Connect Phantom Wallet</button>
  <p id="walletAddress"></p>

  <hr />

  <h2>Create Coin</h2>
  <input id="tokenName" placeholder="Token Name" /><br /><br />
  <input id="tokenSymbol" placeholder="Token Symbol" /><br /><br />
  <input id="tokenSupply" placeholder="Total Supply" /><br /><br />
  <button id="createCoin">Create Coin</button>

  <p id="createStatus"></p>
`

const connectBtn = document.getElementById("connectWallet") as HTMLButtonElement
const walletAddress = document.getElementById("walletAddress") as HTMLParagraphElement
const createBtn = document.getElementById("createCoin") as HTMLButtonElement
const createStatus = document.getElementById("createStatus") as HTMLParagraphElement

const RECEIVER = "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8"
const FEE_LAMPORTS = 50000000 // 0.05 SOL

let provider: any = null

// CONNECT WALLET
connectBtn.onclick = async () => {
  provider = (window as any).solana

  if (!provider || !provider.isPhantom) {
    alert("Open this inside Phantom browser")
    return
  }

  const resp = await provider.connect()
  walletAddress.innerText = "Connected: " + resp.publicKey.toString()
}

// CREATE COIN (PAYMENT)
createBtn.onclick = async () => {
  try {
    if (!provider) {
      createStatus.innerText = "Connect wallet first"
      return
    }

    const solanaWeb3 = (window as any).solanaWeb3

    if (!solanaWeb3) {
      createStatus.innerText = "Solana web3 not loaded"
      return
    }

    const tokenName = (document.getElementById("tokenName") as HTMLInputElement).value
    const tokenSymbol = (document.getElementById("tokenSymbol") as HTMLInputElement).value
    const tokenSupply = (document.getElementById("tokenSupply") as HTMLInputElement).value

    if (!tokenName || !tokenSymbol || !tokenSupply) {
      createStatus.innerText = "Fill all fields"
      return
    }

    createStatus.innerText = "Preparing payment..."

    // ✅ FIXED RPC (NO MORE 403)
    // 🚀 USE YOUR BACKEND API (NO MORE 403)
const blockhashRes = await fetch("/api/blockhash")
const blockhashData = await blockhashRes.json()

if (!blockhashData.blockhash) {
  throw new Error("Failed to get blockhash")
}

const connection = new solanaWeb3.Connection(
  "https://api.mainnet-beta.solana.com",
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

    const blockhash = blockhashData.blockhash
    transaction.recentBlockhash = blockhash

    const signed = await provider.signTransaction(transaction)
    const signature = await connection.sendRawTransaction(signed.serialize())

    await connection.confirmTransaction(signature)
// 🚀 CREATE TOKEN (SPL MINT)

const mintKeypair = solanaWeb3.Keypair.generate()

const lamportsForMint = await connection.getMinimumBalanceForRentExemption(82)

const createMintIx = solanaWeb3.SystemProgram.createAccount({
  fromPubkey: provider.publicKey,
  newAccountPubkey: mintKeypair.publicKey,
  space: 82,
  lamports: lamportsForMint,
  programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
})

const initMintIx = new solanaWeb3.TransactionInstruction({
  keys: [
    { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: true },
    { pubkey: provider.publicKey, isSigner: false, isWritable: false }
  ],
  programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  data: Uint8Array.from([0, 9, 0, 0, 0, ...provider.publicKey.toBytes(), 0])
})

const mintTx = new solanaWeb3.Transaction().add(createMintIx, initMintIx)

mintTx.feePayer = provider.publicKey

const { blockhash: mintBlockhash } = await connection.getLatestBlockhash()
mintTx.recentBlockhash = mintBlockhash

mintTx.partialSign(mintKeypair)

const signedMintTx = await provider.signTransaction(mintTx)

const mintSignature = await connection.sendRawTransaction(signedMintTx.serialize())

await connection.confirmTransaction(mintSignature)

createStatus.innerHTML = `
✅ Payment + Mint Successful<br />
🪙 Token: ${mintKeypair.publicKey.toString()}<br />
Name: ${tokenName}<br />
Symbol: ${tokenSymbol}<br />
Supply: ${tokenSupply}
`
`
    
