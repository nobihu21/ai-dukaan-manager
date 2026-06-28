export type Unit = "kg" | "litre" | "darjan" | "piece" | "packet";
export type ShopCategory = "kiryana" | "clothing" | "hardware" | "other";

export type ShopProfile = {
  name: string;
  category: ShopCategory;
  city: string;
  ownerPhone: string;
  isSetupComplete: boolean;
};

export type InventoryItem = {
  id: string;
  nameUrdu: string;
  nameEnglish?: string;
  qty: number;
  unit: Unit;
  sellPrice: number;
  lowStock: number;
  updatedAt: string;
};

export type CreditEntry = {
  id: string;
  customerName: string;
  phone?: string;
  amount: number;
  amountPaid: number;
  note?: string;
  createdAt: string;
};

export type Transaction = {
  id: string;
  type: "sale" | "purchase" | "adjustment";
  itemName: string;
  qty: number;
  amount: number;
  createdAt: string;
  voiceInputRaw?: string;
};

export type ParsedVoiceCommand = {
  action: "STOCK_IN" | "STOCK_OUT" | "CREDIT" | "SALE" | "UNKNOWN";
  itemName?: string;
  qty?: number;
  unit?: Unit;
  amount?: number;
  customerName?: string;
  confidence: number;
};
