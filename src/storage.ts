import type { CreditEntry, InventoryItem, ShopProfile, Transaction } from "./types";

const keys = {
  inventory: "dukaan.inventory",
  credits: "dukaan.credits",
  transactions: "dukaan.transactions",
  shopName: "dukaan.shopName",
  profile: "dukaan.profile",
};

const emptyInventory: InventoryItem[] = [];
const emptyCredits: CreditEntry[] = [];
const emptyTransactions: Transaction[] = [];

const defaultProfile: ShopProfile = {
  name: "آپ کی دکان",
  category: "kiryana",
  city: "",
  ownerPhone: "",
  isSetupComplete: false,
};

function load<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const store = {
  getProfile: () => {
    const legacyName = localStorage.getItem(keys.shopName);
    const profile = load(keys.profile, defaultProfile);
    return legacyName && !profile.isSetupComplete ? { ...profile, name: legacyName } : profile;
  },
  setProfile: (profile: ShopProfile) => save(keys.profile, profile),
  getShopName: () => store.getProfile().name,
  setShopName: (name: string) => store.setProfile({ ...store.getProfile(), name }),
  getInventory: () => load(keys.inventory, emptyInventory),
  setInventory: (items: InventoryItem[]) => save(keys.inventory, items),
  getCredits: () => load(keys.credits, emptyCredits),
  setCredits: (items: CreditEntry[]) => save(keys.credits, items),
  getTransactions: () => load(keys.transactions, emptyTransactions),
  setTransactions: (items: Transaction[]) => save(keys.transactions, items),
  clearAll: () => {
    localStorage.removeItem(keys.inventory);
    localStorage.removeItem(keys.credits);
    localStorage.removeItem(keys.transactions);
    localStorage.removeItem(keys.shopName);
    localStorage.removeItem(keys.profile);
  },
};
