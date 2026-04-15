export const config = {
  runtime: "nodejs",
  maxDuration: 60
};

const globalStore = globalThis as any;

if (!globalStore.__tsrsLaunches) {
  globalStore.__tsrsLaunches = [];
}

function getLaunches() {
  return globalStore.__tsrsLaunches as any[];
}

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export function rememberLaunch(launch: any) {
  const launches = getLaunches();
  launches.unshift(launch);
  if (launches.length > 100) {
    globalStore.__tsrsLaunches = launches.slice(0, 100);
  }
}


export default async function handler(req: any, res: any) {
  const mint = String(req.query?.mint || "").trim();

  if (!mint) {
    return json(res, 400, { error: "Missing mint" });
  }

const launch = getLaunches().find((item) => item.mintAddress === mint);

  if (!launch) {
    return json(res, 404, { error: "Metadata not found" });
  }

  return json(res, 200, {
    name: launch.tokenName,
    symbol: launch.tokenSymbol,
    description: launch.tokenDescription,
    image: launch.imageUrl,
    attributes: [
      {
        trait_type: "Supply",
        value: launch.tokenSupply
      },
      {
        trait_type: "Mint Address",
        value: launch.mintAddress
      }
    ]
  });
}
