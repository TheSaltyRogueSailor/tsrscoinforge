async function sendLaunchFee() {
  const provider = (window as any).solana

  if (!provider || !provider.isPhantom) {
    alert("Phantom wallet not found")
    return false
  }

  const connection = new (window as any).solanaWeb3.Connection(
    "https://solana-mainnet.g.alchemy.com/v2/VpKm0MUizuIShAsvvW2rJ",
    "confirmed"
  )

  const fromPubkey = provider.publicKey
  const toPubkey = new (window as any).solanaWeb3.PublicKey(
    "9kkjHiAYFryfFVuWfBY9XuvrEVdCGZmWqhUnRGwreso8"
  )

  // 🚀 CRITICAL FIX — FRESH BLOCKHASH
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash()

  const transaction = new (window as any).solanaWeb3.Transaction({
    recentBlockhash: blockhash,
    feePayer: fromPubkey,
  }).add(
    (window as any).solanaWeb3.SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: 0.1 * (window as any).solanaWeb3.LAMPORTS_PER_SOL,
    })
  )

  const signed = await provider.signTransaction(transaction)

  const signature = await connection.sendRawTransaction(
    signed.serialize()
  )

  // 🚀 CONFIRM USING SAME BLOCKHASH
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  })

  return signature
}
