export const config = {
  runtime: "nodejs",
  maxDuration: 60
};

let launches: any[] = [];

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return json(res, 200, { launches });
  }

  if (req.method === "POST") {
    const body = req.body ?? {};

    const launch = {
      id: Date.now().toString(),
      tokenName: String(body.tokenName || ""),
      tokenSymbol: String(body.tokenSymbol || ""),
      tokenDescription: String(body.tokenDescription || ""),
      tokenSupply: String(body.tokenSupply || ""),
      mintAddress: String(body.mintAddress || ""),
      mintSignature: String(body.mintSignature || ""),
      feeSignature: String(body.feeSignature || ""),
      imageUrl: String(body.imageUrl || ""),
      createdAt: new Date().toISOString()
    };

    launches.unshift(launch);

    if (launches.length > 50) {
      launches = launches.slice(0, 50);
    }

    return json(res, 200, { ok: true, launch });
  }

  return json(res, 405, { error: "Method not allowed" });
}
