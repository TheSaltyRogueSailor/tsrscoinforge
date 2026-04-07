document.body.innerHTML = `
  <h1>TSRS Coin Forge 🚀</h1>
  <p>Frontend is LIVE</p>

  <button id="connectWallet">Connect Phantom Wallet</button>
  <p id="walletAddress"></p>
`

const button = document.getElementById("connectWallet")!
const walletText = document.getElementById("walletAddress")!

button.onclick = async () => {
  const provider = (window as any).solana

  if (!provider || !provider.isPhantom) {
    alert("Phantom Wallet not found. Install it.")
    return
  }

  const resp = await provider.connect()
  walletText.innerText = "Connected: " + resp.publicKey.toString()
}
