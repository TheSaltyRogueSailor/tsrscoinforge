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
const RECEIVER_WALLET = "9kkjHiAYFryfFVuWfBY9XuvrEVd"
button.onclick = async () => {
  const provider = (window as any).solana

  if (!provider || !provider.isPhantom) {
    alert("Phantom Wallet not found. Install it or open inside Phantom browser.")
    return
  }

  const resp = await provider.connect()
  walletText.innerText = "Connected: " + resp.publicKey.toString()
}

createCoinBtn.onclick = async () => {
  const tokenName = (document.getElementById("tokenName") as HTMLInputElement).value
  const tokenSymbol = (document.getElementById("tokenSymbol") as HTMLInputElement).value
  const tokenSupply = (document.getElementById("tokenSupply") as HTMLInputElement).value

  if (!tokenName || !tokenSymbol || !tokenSupply) {
    createStatus.innerText = "Please fill in all fields."
    return
  }

  createStatus.innerText =
    "Forge request ready for: " +
    tokenName +
    " (" +
    tokenSymbol +
    ") supply: " +
    tokenSupply
}
