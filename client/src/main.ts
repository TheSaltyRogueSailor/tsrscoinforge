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
`;
