export default async function handler(req: any, res: any) {
  try {
    const rpc =
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"

    const response = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestBlockhash",
        params: [{ commitment: "confirmed" }]
      })
    })

    const data = await response.json()

    if (data.error) {
      return res.status(500).json({ error: data.error })
    }

    return res.status(200).json({
      blockhash: data.result.value.blockhash
    })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "blockhash failed" })
  }
}
