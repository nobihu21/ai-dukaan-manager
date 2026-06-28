import type { ParsedVoiceCommand, Unit } from "./types";

const numberWords: Record<string, number> = {
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
  "ایک": 1,
  "دو": 2,
  "تین": 3,
  "چار": 4,
  "پانچ": 5,
  "چھ": 6,
  "سات": 7,
  "آٹھ": 8,
  "نو": 9,
  "دس": 10,
  "سو": 100,
  "ہزار": 1000,
};

const itemMap: Record<string, string> = {
  anda: "انڈے",
  anday: "انڈے",
  egg: "انڈے",
  eggs: "انڈے",
  cheeni: "چینی",
  sugar: "چینی",
  chai: "چائے",
  tea: "چائے",
  doodh: "دودھ",
  milk: "دودھ",
  aata: "آٹا",
  atta: "آٹا",
  "انڈا": "انڈے",
  "انڈے": "انڈے",
  "چینی": "چینی",
  "چائے": "چائے",
  "دودھ": "دودھ",
  "آٹا": "آٹا",
};

const urduDigitMap: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

function normalizeDigits(text: string) {
  return text.replace(/[۰-۹]/g, (digit) => urduDigitMap[digit] || digit);
}

function extractNumber(text: string) {
  const numeric = normalizeDigits(text).match(/\d+(\.\d+)?/);
  if (numeric) return Number(numeric[0]);
  const word = Object.keys(numberWords).find((key) => text.includes(key));
  if (!word) return undefined;
  const value = numberWords[word];
  if (value < 100 && text.includes("ہزار")) return value * 1000;
  if (value < 100 && text.includes("سو")) return value * 100;
  return value;
}

function extractUnit(text: string): Unit {
  if (text.includes("kg") || text.includes("kilo") || text.includes("کلو")) return "kg";
  if (text.includes("litre") || text.includes("liter") || text.includes("لیٹر")) return "litre";
  if (text.includes("darjan") || text.includes("dozen") || text.includes("درجن")) return "darjan";
  if (text.includes("packet") || text.includes("پیکٹ")) return "packet";
  return "piece";
}

function extractItem(text: string) {
  const key = Object.keys(itemMap).find((entry) => text.includes(entry));
  return key ? itemMap[key] : undefined;
}

export function parseVoiceCommand(rawText: string): ParsedVoiceCommand {
  const text = rawText.toLowerCase().trim();
  const qty = extractNumber(text);
  const itemName = extractItem(text);
  const unit = extractUnit(text);

  if (text.includes("karz") || text.includes("udhar") || text.includes("credit") || text.includes("ادھار") || text.includes("قرض")) {
    const amount = qty;
    const customerMatch =
      text.match(/^([a-zA-Z\u0600-\u06FF]+)\s+(?:ko|کو)\b/) ||
      text.match(/(?:customer|naam|نام)\s+([a-zA-Z\u0600-\u06FF]+)/);
    return {
      action: "CREDIT",
      amount,
      customerName: customerMatch?.[1] || "گاہک",
      confidence: amount ? 0.82 : 0.55,
    };
  }

  if (text.includes("sale") || text.includes("bik") || text.includes("gayi") || text.includes("nikla") || text.includes("بک") || text.includes("فروخت")) {
    return {
      action: "SALE",
      itemName,
      qty,
      unit,
      confidence: itemName && qty ? 0.86 : 0.52,
    };
  }

  if (text.includes("aaya") || text.includes("aya") || text.includes("stock in") || text.includes("add") || text.includes("آیا") || text.includes("آئی") || text.includes("آئے") || text.includes("شامل")) {
    return {
      action: "STOCK_IN",
      itemName,
      qty,
      unit,
      confidence: itemName && qty ? 0.88 : 0.5,
    };
  }

  if (text.includes("kam") || text.includes("minus") || text.includes("stock out") || text.includes("کم") || text.includes("نکلا")) {
    return {
      action: "STOCK_OUT",
      itemName,
      qty,
      unit,
      confidence: itemName && qty ? 0.8 : 0.48,
    };
  }

  return { action: "UNKNOWN", confidence: 0.2 };
}
