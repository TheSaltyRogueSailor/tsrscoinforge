export const config = {
  runtime: "nodejs",
  maxDuration: 60
};

let launches: any[] = [];

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export function rememberLaunch(launch: any) {
  launches.unshift(launch);
  if (launches.length > 100) {
    launches = launches.slice(0, 100);
  }
}

export default async function handler(req: any, res: any) {
  const mint = String(req.query?.mint || "").trim();

  if (!mint) {
    return json(res, 400, { error: "Missing mint" });
  }

  const launch = launches.find((item) => item.mintAddress === mint);

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
