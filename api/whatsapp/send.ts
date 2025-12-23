import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { instanceId, accessToken, phone, message } = req.body || {};

    if (!instanceId || !accessToken || !phone || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const payload = {
      instance_id: instanceId,
      access_token: accessToken,
      phone,
      message,
    };

    const apiResponse = await fetch("https://wawp.net/api/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await apiResponse.json().catch(() => ({}));

    if (!apiResponse.ok || result.success === false) {
      const errorMsg =
        result.error ||
        result.message ||
        result.details ||
        `HTTP ${apiResponse.status}`;
      return res.status(500).json({ success: false, error: errorMsg });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Server error" });
  }
}

