export const config = {
  runtime: "nodejs",
  maxDuration: 60
};

import fs from "fs";
import path from "path";

const LAUNCHES_FILE = path.join(process.cwd(), "launches.json");

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readLaunches() {
  try {
    if (!fs.existsSync(LAUNCHES_FILE)) {
      fs.writeFileSync(LAUNCHES_FILE, "[]", "utf8");
    }

    const raw = fs.readFileSync(LAUNCHES_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeLaunches(launches: any[]) {
  fs.writeFileSync(LAUNCHES_FILE, JSON.stringify(launches, null, 2), "utf8");
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    const launches = readLaunches();
    return json(res, 200, { launches });
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    const launches = readLaunches();

    const launch = {
      tokenName: String(body.tokenName || ""),
      tokenSymbol: String(body.tokenSymbol || ""),
      tokenDescription: String(body.tokenDescription || ""),
      tokenSupply: String(body.tokenSupply || ""),
      mintAddress: String(body.mintAddress || ""),
      mintSignature: String(body.mintSignature || ""),
      feeSignature: String(body.feeSignature || ""),
      imageUrl: String(body.imageUrl || ""),
      createdAt: String(body.createdAt || new Date().toISOString())
    };

    launches.unshift(launch);

    const trimmed = launches.slice(0, 100);
    writeLaunches(trimmed);

    return json(res, 200, { ok: true, launch });
  }

  return json(res, 405, { error: "Method not allowed" });
}
