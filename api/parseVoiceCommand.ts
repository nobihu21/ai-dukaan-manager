import type { VercelRequest, VercelResponse } from "@vercel/node";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Unit = "kg" | "litre" | "darjan" | "piece" | "packet";
type ParsedVoiceCommand = {
  action: "STOCK_IN" | "STOCK_OUT" | "CREDIT" | "SALE" | "UNKNOWN";
  itemName?: string;
  qty?: number;
  unit?: Unit;
  amount?: number;
  customerName?: string;
  confidence: number;
  notes?: string;
};

function sanitizeText(value: unknown) {
  return String(value || "").trim().slice(0, 500);
}

const fallbackNumbers: Record<string, number> = {
  aik: 1,
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  panch: 5,
  paanch: 5,
  che: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  ایک: 1,
  دو: 2,
  تین: 3,
  چار: 4,
  پانچ: 5,
  چھ: 6,
  سات: 7,
  آٹھ: 8,
  نو: 9,
  دس: 10,
};

const fallbackItems: Record<string, string> = {
  cheeni: "چینی",
  sugar: "چینی",
  chai: "چائے",
  tea: "چائے",
  doodh: "دودھ",
  milk: "دودھ",
  aata: "آٹا",
  atta: "آٹا",
  anda: "انڈے",
  anday: "انڈے",
  egg: "انڈے",
  eggs: "انڈے",
  چینی: "چینی",
  چائے: "چائے",
  دودھ: "دودھ",
  آٹا: "آٹا",
  انڈا: "انڈے",
  انڈے: "انڈے",
};

function parseFallbackNumber(text: string) {
  const numeric = text.match(/\d+(\.\d+)?/);
  if (numeric) return Number(numeric[0]);

  const word = Object.keys(fallbackNumbers).find((entry) => text.includes(entry));
  if (!word) return undefined;

  const value = fallbackNumbers[word];
  if (text.includes("hazaar") || text.includes("thousand") || text.includes("ہزار")) return value * 1000;
  if (text.includes("so") || text.includes("hundred") || text.includes("سو")) return value * 100;
  return value;
}

function parseFallbackUnit(text: string): Unit {
  if (text.includes("kg") || text.includes("kilo") || text.includes("کلو")) return "kg";
  if (text.includes("litre") || text.includes("liter") || text.includes("لیٹر")) return "litre";
  if (text.includes("darjan") || text.includes("dozen") || text.includes("درجن")) return "darjan";
  if (text.includes("packet") || text.includes("پیکٹ")) return "packet";
  return "piece";
}

function parseFallbackCommand(text: string): ParsedVoiceCommand {
  const clean = text.toLowerCase().trim();
  const qty = parseFallbackNumber(clean);
  const itemKey = Object.keys(fallbackItems).find((entry) => clean.includes(entry));
  const itemName = itemKey ? fallbackItems[itemKey] : undefined;
  const unit = parseFallbackUnit(clean);

  if (clean.includes("karz") || clean.includes("udhar") || clean.includes("credit") || clean.includes("ادھار") || clean.includes("قرض")) {
    const customerMatch =
      clean.match(/^([a-z\u0600-\u06FF]+)\s+(?:ko|ku|کو)(?:\s|$)/) ||
      clean.match(/(?:customer|naam|name|نام)\s+([a-z\u0600-\u06FF]+)/);
    return {
      action: "CREDIT",
      amount: qty,
      customerName: customerMatch?.[1] || "گاہک",
      confidence: qty ? 0.78 : 0.45,
      notes: "AI service unavailable; local parser used.",
    };
  }

  if (clean.includes("sale") || clean.includes("bik") || clean.includes("gayi") || clean.includes("sold") || clean.includes("بک") || clean.includes("فروخت")) {
    return {
      action: "SALE",
      itemName,
      qty,
      unit,
      confidence: itemName && qty ? 0.8 : 0.45,
      notes: "AI service unavailable; local parser used.",
    };
  }

  if (clean.includes("aaya") || clean.includes("aya") || clean.includes("stock in") || clean.includes("add") || clean.includes("آئی") || clean.includes("آیا") || clean.includes("شامل")) {
    return {
      action: "STOCK_IN",
      itemName,
      qty,
      unit,
      confidence: itemName && qty ? 0.82 : 0.45,
      notes: "AI service unavailable; local parser used.",
    };
  }

  if (clean.includes("kam") || clean.includes("minus") || clean.includes("stock out") || clean.includes("nikla") || clean.includes("کم") || clean.includes("نکلا")) {
    return {
      action: "STOCK_OUT",
      itemName,
      qty,
      unit,
      confidence: itemName && qty ? 0.76 : 0.42,
      notes: "AI service unavailable; local parser used.",
    };
  }

  return {
    action: "UNKNOWN",
    confidence: 0.2,
    notes: "AI service unavailable; local parser used.",
  };
}

function getServerEnv(name: string) {
  if (process.env[name]) return process.env[name];
  if (process.env.VERCEL === "1") return undefined;

  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return undefined;

  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`));

  return line?.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

function parseJson(content: string): ParsedVoiceCommand {
  const clean = content.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as Partial<ParsedVoiceCommand>;
  const allowedActions = ["STOCK_IN", "STOCK_OUT", "CREDIT", "SALE", "UNKNOWN"];
  const allowedUnits: Unit[] = ["kg", "litre", "darjan", "piece", "packet"];
  const action = allowedActions.includes(String(parsed.action)) ? parsed.action : "UNKNOWN";
  const qty = typeof parsed.qty === "number" && Number.isFinite(parsed.qty) && parsed.qty > 0 ? parsed.qty : undefined;
  const amount = typeof parsed.amount === "number" && Number.isFinite(parsed.amount) && parsed.amount > 0 ? parsed.amount : undefined;
  const unit = allowedUnits.includes(parsed.unit as Unit) ? (parsed.unit as Unit) : undefined;

  return {
    action: action as ParsedVoiceCommand["action"],
    itemName: parsed.itemName ? String(parsed.itemName).trim().slice(0, 80) : undefined,
    qty,
    unit,
    amount,
    customerName: parsed.customerName ? String(parsed.customerName).trim().slice(0, 80) : undefined,
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.4,
    notes: parsed.notes ? String(parsed.notes).slice(0, 180) : undefined,
  };
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const geminiApiKey = getServerEnv("GEMINI_API_KEY");
  const xaiApiKey = getServerEnv("XAI_API_KEY");

  let body: { text?: unknown; category?: unknown };
  try {
    body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
  } catch {
    return response.status(400).json({ error: "Invalid JSON body." });
  }

  const text = sanitizeText(body.text);
  const category = sanitizeText(body.category || "kiryana");

  if (!text) {
    return response.status(400).json({ error: "Command text is required." });
  }

  if (!geminiApiKey && !xaiApiKey) {
    return response.status(200).json(parseFallbackCommand(text));
  }

  try {
    if (geminiApiKey) {
      const geminiResponse = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": geminiApiKey,
          },
          body: JSON.stringify({
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
            },
            contents: [
              {
                parts: [
                  {
                    text:
                      "Parse this Pakistani shopkeeper Urdu/Roman Urdu command for an inventory app. Return ONLY JSON with fields: action (STOCK_IN, STOCK_OUT, CREDIT, SALE, UNKNOWN), itemName Urdu when possible, qty number, unit (kg, litre, darjan, piece, packet), amount number, customerName, confidence 0-1, notes. Command data: " +
                      JSON.stringify({ shopCategory: category, command: text }),
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!geminiResponse.ok) {
        return response.status(200).json(parseFallbackCommand(text));
      }

      const payload = (await geminiResponse.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        return response.status(200).json(parseFallbackCommand(text));
      }

      try {
        return response.status(200).json(parseJson(content));
      } catch {
        return response.status(200).json(parseFallbackCommand(text));
      }
    }

    const xaiResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${xaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.3",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You parse Pakistani shopkeeper Urdu/Roman Urdu commands for an inventory app. Return ONLY compact JSON with fields: action (STOCK_IN, STOCK_OUT, CREDIT, SALE, UNKNOWN), itemName Urdu when possible, qty number, unit (kg, litre, darjan, piece, packet), amount number, customerName, confidence 0-1, notes. Do not explain.",
          },
          {
            role: "user",
            content: JSON.stringify({ shopCategory: category, command: text }),
          },
        ],
      }),
    });

    if (!xaiResponse.ok) {
      return response.status(200).json(parseFallbackCommand(text));
    }

    const payload = (await xaiResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return response.status(200).json(parseFallbackCommand(text));
    }

    try {
      return response.status(200).json(parseJson(content));
    } catch {
      return response.status(200).json(parseFallbackCommand(text));
    }
  } catch (error) {
    return response.status(200).json(parseFallbackCommand(text));
  }
}
