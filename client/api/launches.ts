export const config = {
  runtime: "nodejs",
  maxDuration: 60
};

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || "";

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase environment variables");
  }

  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
  headers.set("Authorization", `Bearer ${SUPABASE_PUBLISHABLE_KEY}`);

  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers
  });
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "GET") {
      const response = await supabaseRequest(
        "/rest/v1/launches?select=token_name,token_symbol,token_description,token_supply,mint_address,mint_signature,fee_signature,image_url,created_at&order=created_at.desc&limit=50"
      );

      const data = await response.json();

      if (!response.ok) {
        return json(res, 500, { error: data?.message || "Failed to load launches" });
      }

      const launches = (Array.isArray(data) ? data : []).map((row: any) => ({
        tokenName: row.token_name || "",
        tokenSymbol: row.token_symbol || "",
        tokenDescription: row.token_description || "",
        tokenSupply: row.token_supply || "",
        mintAddress: row.mint_address || "",
        mintSignature: row.mint_signature || "",
        feeSignature: row.fee_signature || "",
        imageUrl: row.image_url || "",
        createdAt: row.created_at || ""
      }));

      return json(res, 200, { launches });
    }

    if (req.method === "POST") {
      const body = req.body ?? {};

      const payload = {
        token_name: String(body.tokenName || ""),
        token_symbol: String(body.tokenSymbol || ""),
        token_description: String(body.tokenDescription || ""),
        token_supply: String(body.tokenSupply || ""),
        mint_address: String(body.mintAddress || ""),
        mint_signature: String(body.mintSignature || ""),
        fee_signature: String(body.feeSignature || ""),
        image_url: String(body.imageUrl || ""),
        created_at: String(body.createdAt || new Date().toISOString())
      };

      const response = await supabaseRequest("/rest/v1/launches", {
        method: "POST",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        return json(res, 500, { error: data?.message || "Failed to save launch" });
      }

      return json(res, 200, {
        ok: true,
        launch: Array.isArray(data) ? data[0] : data
      });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (err: any) {
    return json(res, 500, { error: err?.message || "Unknown server error" });
  }
}
