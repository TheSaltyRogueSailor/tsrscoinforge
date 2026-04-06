declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString(): string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString(): string };
      on?: (event: string, callback: () => void) => void;
    };
  }
}

const app = document.getElementById('app');

if (!app) {
  throw new Error('App root not found');
}

function getProvider() {
  if (typeof window !== 'undefined' && window.solana?.isPhantom) {
    return window.solana;
  }
  return null;
}

function shortKey(key: string) {
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function renderDisconnected() {
  app!.innerHTML = `
    <div class="page">
      <div class="card">
        <h1>TSRS Coin Forge 🚀</h1>
        <p class="sub">Frontend is LIVE</p>
        <div class="status-row">
          <span class="label">Wallet Status</span>
          <span class="badge off">Not Connected</span>
        </div>
        <button id="connectBtn" class="btn primary">Connect Phantom</button>
        <p class="note">
          On mobile, open this site inside the Phantom in-app browser for wallet connection.
        </p>
      </div>
    </div>
  `;

  const connectBtn = document.getElementById('connectBtn');
  connectBtn?.addEventListener('click', connectWallet);
}

function renderConnected(publicKey: string) {
  app!.innerHTML = `
    <div class="page">
      <div class="card">
        <h1>TSRS Coin Forge 🚀</h1>
        <p class="sub">Frontend is LIVE</p>
        <div class="status-row">
          <span class="label">Wallet Status</span>
          <span class="badge on">Connected</span>
        </div>
        <div class="wallet-box">
          <div class="wallet-label">Connected Wallet</div>
          <div class="wallet-key">${publicKey}</div>
          <div class="wallet-short">${shortKey(publicKey)}</div>
        </div>
        <div class="actions">
          <button id="disconnectBtn" class="btn danger">Disconnect</button>
        </div>
      </div>
    </div>
  `;

  const disconnectBtn = document.getElementById('disconnectBtn');
  disconnectBtn?.addEventListener('click', disconnectWallet);
}

function renderNoPhantom() {
  app!.innerHTML = `
    <div class="page">
      <div class="card">
        <h1>TSRS Coin Forge 🚀</h1>
        <p class="sub">Frontend is LIVE</p>
        <div class="status-row">
          <span class="label">Wallet Status</span>
          <span class="badge off">Phantom Not Found</span>
        </div>
        <p class="note">
          Phantom wallet was not detected. On desktop, install Phantom. On mobile, open this page inside Phantom's browser.
        </p>
        <button id="retryBtn" class="btn primary">Retry Detection</button>
      </div>
    </div>
  `;

  const retryBtn = document.getElementById('retryBtn');
  retryBtn?.addEventListener('click', init);
}

async function connectWallet() {
  const provider = getProvider();

  if (!provider) {
    renderNoPhantom();
    return;
  }

  try {
    const response = await provider.connect();
    const publicKey = response.publicKey.toString();
    renderConnected(publicKey);
  } catch (error) {
    console.error('Wallet connection failed:', error);
    alert('Wallet connection failed.');
    renderDisconnected();
  }
}

async function disconnectWallet() {
  const provider = getProvider();

  if (!provider) {
    renderNoPhantom();
    return;
  }

  try {
    await provider.disconnect();
    renderDisconnected();
  } catch (error) {
    console.error('Wallet disconnect failed:', error);
    alert('Wallet disconnect failed.');
  }
}

function init() {
  const provider = getProvider();

  if (!provider) {
    renderNoPhantom();
    return;
  }

  const existingKey = provider.publicKey?.toString();

  if (existingKey) {
    renderConnected(existingKey);
  } else {
    renderDisconnected();
  }

  provider.on?.('connect', () => {
    const key = provider.publicKey?.toString();
    if (key) renderConnected(key);
  });

  provider.on?.('disconnect', () => {
    renderDisconnected();
  });
}

init();

export {};
`
