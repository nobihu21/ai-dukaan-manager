import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CreditEntry, InventoryItem, ShopProfile, Transaction } from "./types";

export type Unsubscribe = () => void;

const shopPath = (shopId: string) => doc(db, "shops", shopId);
const subCollection = (shopId: string, name: string) => collection(db, "shops", shopId, name);

export function subscribeShop(
  shopId: string,
  onData: (profile: ShopProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(shopPath(shopId), (snapshot) => {
    onData(snapshot.exists() ? (snapshot.data() as ShopProfile) : null);
  }, onError);
}

export async function saveShopProfile(shopId: string, profile: ShopProfile) {
  await setDoc(
    shopPath(shopId),
    {
      ...profile,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeInventory(
  shopId: string,
  onData: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(query(subCollection(shopId, "inventory_items"), orderBy("updatedAt", "desc")), (snapshot) => {
    onData(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<InventoryItem, "id">) })));
  }, onError);
}

export async function saveInventoryItem(shopId: string, item: InventoryItem) {
  const { id, ...data } = item;
  if (id) {
    await setDoc(doc(db, "shops", shopId, "inventory_items", id), data, { merge: true });
    return id;
  }
  const created = await addDoc(subCollection(shopId, "inventory_items"), data);
  return created.id;
}

export async function updateInventoryQty(shopId: string, itemId: string, qty: number) {
  await updateDoc(doc(db, "shops", shopId, "inventory_items", itemId), {
    qty,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeCredits(
  shopId: string,
  onData: (items: CreditEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(query(subCollection(shopId, "credits"), orderBy("createdAt", "desc")), (snapshot) => {
    onData(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<CreditEntry, "id">) })));
  }, onError);
}

export async function saveCredit(shopId: string, credit: CreditEntry) {
  const { id, ...data } = credit;
  if (id) {
    await setDoc(doc(db, "shops", shopId, "credits", id), data, { merge: true });
    return id;
  }
  const created = await addDoc(subCollection(shopId, "credits"), data);
  return created.id;
}

export async function updateCreditPaid(shopId: string, creditId: string, amountPaid: number) {
  await updateDoc(doc(db, "shops", shopId, "credits", creditId), { amountPaid });
}

export function subscribeTransactions(
  shopId: string,
  onData: (items: Transaction[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(query(subCollection(shopId, "transactions"), orderBy("createdAt", "desc")), (snapshot) => {
    onData(snapshot.docs.map((entry) => ({ id: entry.id, ...(entry.data() as Omit<Transaction, "id">) })));
  }, onError);
}

export async function saveTransaction(shopId: string, transaction: Transaction) {
  const { id, ...data } = transaction;
  if (id) {
    await setDoc(doc(db, "shops", shopId, "transactions", id), data, { merge: true });
    return id;
  }
  const created = await addDoc(subCollection(shopId, "transactions"), data);
  return created.id;
}

export async function deleteInventoryItem(shopId: string, itemId: string) {
  await deleteDoc(doc(db, "shops", shopId, "inventory_items", itemId));
}
