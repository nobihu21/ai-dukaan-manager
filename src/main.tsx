import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import {
  Bell,
  ChartNoAxesCombined,
  CheckCircle2,
  ClipboardCheck,
  Hammer,
  Home,
  Mic,
  Minus,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Shirt,
  ShoppingBasket,
  Store,
  UserRound,
  WalletCards,
} from "lucide-react";
import { DukaanScene } from "./DukaanScene";
import { parseVoiceCommandWithAI } from "./aiService";
import { auth } from "./firebase";
import {
  saveCredit,
  saveInventoryItem,
  saveShopProfile,
  saveTransaction,
  subscribeCredits,
  subscribeInventory,
  subscribeShop,
  subscribeTransactions,
  updateCreditPaid,
  updateInventoryQty,
} from "./firestoreService";
import { store } from "./storage";
import type {
  CreditEntry,
  InventoryItem,
  ParsedVoiceCommand,
  ShopCategory,
  ShopProfile,
  Transaction,
  Unit,
} from "./types";
import "./styles.css";

const urduDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

const shopConfigs: Record<
  ShopCategory,
  {
    title: string;
    subtitle: string;
    action: string;
    hero: string;
    accentClass: string;
    icon: React.ReactNode;
    firstItems: string[];
    reportHint: string;
    workflows: Array<{ label: string; detail: string; tab: string; icon: React.ReactNode }>;
  }
> = {
  kiryana: {
    title: "کریانہ موڈ",
    subtitle: "روزانہ اسٹاک، سیل، کم مال اور ادھار ایک جگہ۔",
    action: "آٹا، چینی، چائے یا دودھ شامل کریں",
    hero: "تیز اسٹاک، ادھار کھاتا، اور کم مال کی اطلاع دکان کے حساب سے۔",
    accentClass: "theme-kiryana",
    icon: <ShoppingBasket />,
    firstItems: ["چینی", "آٹا", "چائے", "دودھ"],
    reportHint: "کریانہ رپورٹ میں کم اسٹاک اور روز کی سیل سب سے پہلے دکھتی ہے۔",
    workflows: [
      { label: "مال آیا", detail: "اسٹاک میں اضافہ", tab: "inventory", icon: <PackageCheck /> },
      { label: "مال بکا", detail: "فروخت درج", tab: "inventory", icon: <ReceiptText /> },
      { label: "ادھار لکھیں", detail: "کھاتا محفوظ", tab: "credits", icon: <WalletCards /> },
      { label: "آج کا حساب", detail: "روزانہ خلاصہ", tab: "reports", icon: <ClipboardCheck /> },
    ],
  },
  clothing: {
    title: "بوتیک موڈ",
    subtitle: "سوٹ، سائز، گاہک ادھار اور آرڈر یاد دہانی کے لیے۔",
    action: "لان، کاٹن، ریڈی میڈ یا سوٹ شامل کریں",
    hero: "مال کو سائز اور قسم کے حساب سے رکھیں، ادھار اور بکنگ ساتھ ساتھ۔",
    accentClass: "theme-clothing",
    icon: <Shirt />,
    firstItems: ["لان سوٹ", "کاٹن", "دوپٹہ", "ریڈی میڈ"],
    reportHint: "بوتیک رپورٹ میں زیادہ بکنے والی قسمیں اور گاہک کا بیلنس سامنے رہتا ہے۔",
    workflows: [
      { label: "نیا ڈیزائن", detail: "مال شامل", tab: "inventory", icon: <PackageCheck /> },
      { label: "آرڈر بکا", detail: "فروخت درج", tab: "inventory", icon: <ReceiptText /> },
      { label: "گاہک بیلنس", detail: "ادھار کھاتا", tab: "credits", icon: <WalletCards /> },
      { label: "سیل رپورٹ", detail: "روز کا خلاصہ", tab: "reports", icon: <ClipboardCheck /> },
    ],
  },
  hardware: {
    title: "ہارڈ ویئر موڈ",
    subtitle: "پیچ، پینٹ، اوزار، سپلائر اور زیادہ مال کے لیے۔",
    action: "پینٹ، پیچ، پائپ یا اوزار شامل کریں",
    hero: "زیادہ مقدار، سپلائر یاد دہانی، اور روزانہ خرید و فروخت کے لیے ترتیب۔",
    accentClass: "theme-hardware",
    icon: <Hammer />,
    firstItems: ["پینٹ", "پیچ", "پائپ", "ہتھوڑی"],
    reportHint: "ہارڈ ویئر رپورٹ میں خرید لاگت، مال کی قیمت اور سپلائر ادھار اہم ہیں۔",
    workflows: [
      { label: "زیادہ مال", detail: "مال آیا", tab: "inventory", icon: <PackageCheck /> },
      { label: "فروخت", detail: "کاؤنٹر سیل", tab: "inventory", icon: <ReceiptText /> },
      { label: "سپلائر ادھار", detail: "رقم باقی", tab: "credits", icon: <WalletCards /> },
      { label: "مال کی قیمت", detail: "رپورٹ", tab: "reports", icon: <ClipboardCheck /> },
    ],
  },
  other: {
    title: "جنرل شاپ موڈ",
    subtitle: "آپ کے کام کے مطابق آسان اسٹاک اور ادھار کھاتا۔",
    action: "اپنا پہلا آئٹم شامل کریں",
    hero: "سادہ ڈیش بورڈ جو آپ کے کام کے حساب سے آگے بڑھے گا۔",
    accentClass: "theme-other",
    icon: <Store />,
    firstItems: ["آئٹم 1", "آئٹم 2", "آئٹم 3"],
    reportHint: "رپورٹ آپ کے اصل لین دین سے بنے گی۔",
    workflows: [
      { label: "آئٹم شامل", detail: "اسٹاک", tab: "inventory", icon: <PackageCheck /> },
      { label: "فروخت", detail: "لین دین", tab: "inventory", icon: <ReceiptText /> },
      { label: "ادھار", detail: "کھاتا", tab: "credits", icon: <WalletCards /> },
      { label: "رپورٹ", detail: "خلاصہ", tab: "reports", icon: <ClipboardCheck /> },
    ],
  },
};

function bilingualNumber(value: number | string) {
  const western = String(value);
  const urdu = western.replace(/\d/g, (digit) => urduDigits[Number(digit)]);
  return `${urdu} (${western})`;
}

function money(value: number) {
  return `${bilingualNumber(Math.round(value))} روپے`;
}

function unitLabel(unit: Unit) {
  const labels: Record<Unit, string> = {
    piece: "عدد",
    kg: "کلو",
    litre: "لیٹر",
    darjan: "درجن",
    packet: "پیکٹ",
  };
  return labels[unit];
}

function commandActionLabel(action: ParsedVoiceCommand["action"]) {
  const labels: Record<ParsedVoiceCommand["action"], string> = {
    STOCK_IN: "مال آیا",
    STOCK_OUT: "مال کم ہوا",
    CREDIT: "ادھار",
    SALE: "فروخت",
    UNKNOWN: "واضح نہیں",
  };
  return labels[action];
}

function normalizeItemName(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[َُِّْٰ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [profile, setProfileState] = useState<ShopProfile>(store.getProfile());
  const [inventory, setInventoryState] = useState<InventoryItem[]>(store.getInventory());
  const [credits, setCreditsState] = useState<CreditEntry[]>(store.getCredits());
  const [transactions, setTransactionsState] = useState<Transaction[]>(store.getTransactions());
  const [voiceText, setVoiceText] = useState("");
  const [parsedCommand, setParsedCommand] = useState<ParsedVoiceCommand | null>(null);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [firestoreError, setFirestoreError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [itemForm, setItemForm] = useState({
    nameUrdu: "",
    qty: "",
    unit: "piece" as Unit,
    sellPrice: "",
    lowStock: "",
  });
  const [creditForm, setCreditForm] = useState({ customerName: "", amount: "", phone: "" });
  const shopId = authUser?.uid;

  const config = shopConfigs[profile.category];

  function setProfile(next: ShopProfile) {
    setProfileState(next);
    store.setProfile(next);
    if (shopId) {
      void saveShopProfile(shopId, next).catch((error) => {
        console.error("Profile save error", error);
        setFirestoreError("دکان کی معلومات محفوظ نہیں ہو سکیں۔ انٹرنیٹ دیکھ کر دوبارہ کوشش کریں۔");
      });
    }
  }

  function setInventory(items: InventoryItem[]) {
    setInventoryState(items);
    store.setInventory(items);
  }

  function setCredits(items: CreditEntry[]) {
    setCreditsState(items);
    store.setCredits(items);
  }

  function setTransactions(items: Transaction[]) {
    setTransactionsState(items);
    store.setTransactions(items);
  }

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!shopId) return;
    const handleFirestoreError = (error: Error) => {
      console.error("Firestore sync error", error);
      setFirestoreError(error.message);
    };
    const unsubscribers = [
      subscribeShop(shopId, (remoteProfile) => {
        setFirestoreError("");
        if (remoteProfile) {
          setProfileState(remoteProfile);
          store.setProfile(remoteProfile);
        } else {
          const initialProfile = {
            ...profile,
            ownerPhone: profile.ownerPhone,
          };
          setProfileState(initialProfile);
          store.setProfile(initialProfile);
          void saveShopProfile(shopId, initialProfile).catch(handleFirestoreError);
        }
      }, handleFirestoreError),
      subscribeInventory(shopId, (items) => {
        setFirestoreError("");
        setInventoryState(items);
        store.setInventory(items);
      }, handleFirestoreError),
      subscribeCredits(shopId, (items) => {
        setFirestoreError("");
        setCreditsState(items);
        store.setCredits(items);
      }, handleFirestoreError),
      subscribeTransactions(shopId, (items) => {
        setFirestoreError("");
        setTransactionsState(items);
        store.setTransactions(items);
      }, handleFirestoreError),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [shopId]);

  const lowStockItems = inventory.filter((item) => item.qty <= item.lowStock);
  const totalCredit = credits.reduce((sum, entry) => sum + Math.max(0, entry.amount - entry.amountPaid), 0);
  const todayKey = new Date().toDateString();
  const todaySales = transactions
    .filter((txn) => txn.type === "sale" && new Date(txn.createdAt).toDateString() === todayKey)
    .reduce((sum, txn) => sum + txn.amount, 0);

  const filteredInventory = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return inventory;
    return inventory.filter((item) => {
      return item.nameUrdu.includes(cleanQuery) || item.nameEnglish?.toLowerCase().includes(cleanQuery);
    });
  }, [inventory, query]);

  async function addItem(event: React.FormEvent) {
    event.preventDefault();
    if (actionBusy) return;
    const qty = Number(itemForm.qty);
    const sellPrice = Number(itemForm.sellPrice || 0);
    const lowStock = Number(itemForm.lowStock || 1);
    if (!itemForm.nameUrdu.trim() || !Number.isFinite(qty) || qty <= 0 || sellPrice < 0 || lowStock < 0) {
      setActionError("آئٹم کا نام اور درست مثبت مقدار لکھیں۔");
      return;
    }
    setActionBusy(true);
    setActionError("");
    const next: InventoryItem = {
      id: uid("item"),
      nameUrdu: itemForm.nameUrdu.trim(),
      qty,
      unit: itemForm.unit,
      sellPrice,
      lowStock,
      updatedAt: new Date().toISOString(),
    };
    try {
      if (shopId) {
        await saveInventoryItem(shopId, { ...next, id: "" });
      } else {
        setInventory([next, ...inventory]);
      }
      setItemForm({ nameUrdu: "", qty: "", unit: "piece", sellPrice: "", lowStock: "" });
    } catch (error) {
      console.error("Inventory save error", error);
      setActionError("آئٹم محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔");
    } finally {
      setActionBusy(false);
    }
  }

  function quickFillItem(nameUrdu: string) {
    setActiveTab("inventory");
    setItemForm({ ...itemForm, nameUrdu });
  }

  async function updateStock(id: string, delta: number, raw?: string) {
    const item = inventory.find((entry) => entry.id === id);
    if (!item) return 0;
    const nextQty = Math.max(0, item.qty + delta);
    const appliedDelta = nextQty - item.qty;
    if (appliedDelta === 0) return 0;
    const nextTransaction = {
        id: uid("txn"),
        type: appliedDelta < 0 ? "sale" : "purchase",
        itemName: item.nameUrdu,
        qty: Math.abs(appliedDelta),
        amount: Math.abs(appliedDelta) * item.sellPrice,
        createdAt: new Date().toISOString(),
        voiceInputRaw: raw,
      } as Transaction;
    if (shopId) {
      await updateInventoryQty(shopId, id, nextQty);
      await saveTransaction(shopId, { ...nextTransaction, id: "" });
    } else {
      setInventory(
        inventory.map((entry) =>
          entry.id === id ? { ...entry, qty: nextQty, updatedAt: new Date().toISOString() } : entry
        )
      );
      setTransactions([nextTransaction, ...transactions]);
    }
    return appliedDelta;
  }

  async function adjustStockFromButton(id: string, delta: number) {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError("");
    try {
      const appliedDelta = await updateStock(id, delta);
      if (appliedDelta === 0) {
        setActionError("اس آئٹم کا اسٹاک پہلے ہی صفر ہے۔");
      }
    } catch (error) {
      console.error("Stock update error", error);
      setActionError("اسٹاک محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔");
    } finally {
      setActionBusy(false);
    }
  }

  async function addCredit(event: React.FormEvent) {
    event.preventDefault();
    if (actionBusy) return;
    const amount = Number(creditForm.amount);
    if (!creditForm.customerName.trim() || !Number.isFinite(amount) || amount <= 0) {
      setActionError("گاہک کا نام اور درست مثبت رقم لکھیں۔");
      return;
    }
    setActionBusy(true);
    setActionError("");
    const next: CreditEntry = {
      id: uid("credit"),
      customerName: creditForm.customerName.trim(),
      phone: creditForm.phone.trim(),
      amount,
      amountPaid: 0,
      createdAt: new Date().toISOString(),
    };
    try {
      if (shopId) {
        await saveCredit(shopId, { ...next, id: "" });
      } else {
        setCredits([next, ...credits]);
      }
      setCreditForm({ customerName: "", amount: "", phone: "" });
    } catch (error) {
      console.error("Credit save error", error);
      setActionError("ادھار محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔");
    } finally {
      setActionBusy(false);
    }
  }

  async function markCreditPaid(id: string) {
    const entry = credits.find((credit) => credit.id === id);
    if (!entry) return;
    if (shopId) {
      await updateCreditPaid(shopId, id, entry.amount);
    } else {
      setCredits(credits.map((credit) => (credit.id === id ? { ...credit, amountPaid: credit.amount } : credit)));
    }
  }

  async function settleCredit(id: string) {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError("");
    try {
      await markCreditPaid(id);
    } catch (error) {
      console.error("Credit paid update error", error);
      setActionError("ادھار کلیئر نہیں ہو سکا۔ دوبارہ کوشش کریں۔");
    } finally {
      setActionBusy(false);
    }
  }

  function canApplyVoiceCommand(command: ParsedVoiceCommand) {
    if (command.action === "CREDIT") return Boolean(command.amount);
    if (["STOCK_IN", "STOCK_OUT", "SALE"].includes(command.action)) return Boolean(command.itemName && command.qty);
    return false;
  }

  function micErrorMessage(error?: string) {
    if (error === "network") {
      return "آواز کی سروس اس وقت دستیاب نہیں۔ نیچے وہی حکم لکھ دیں، کام اسی طرح ہو جائے گا۔";
    }
    if (error === "not-allowed" || error === "service-not-allowed") {
      return "مائیک کی اجازت بند ہے۔ براؤزر میں مائیک اجازت دیں، یا حکم لکھ کر کام کریں۔";
    }
    if (error === "no-speech") {
      return "آواز صاف نہیں آئی۔ دوبارہ بولیں یا حکم لکھ دیں۔";
    }
    if (error === "audio-capture") {
      return "مائیک نہیں مل رہا۔ مائیک چیک کریں یا حکم لکھ دیں۔";
    }
    return "آواز سمجھ نہیں آئی۔ حکم لکھ کر بھی یہی کام ہو سکتا ہے۔";
  }

  async function parseVoice(textOverride = voiceText, autoApply = false) {
    const commandText = textOverride.trim();
    if (!commandText) {
      setVoiceStatus("پہلے حکم لکھیں یا مائیک سے بولیں۔ مثال: تین کلو چینی آئی");
      return;
    }
    setVoiceBusy(true);
    setVoiceStatus("");
    setVoiceText(commandText);
    try {
      const result = await parseVoiceCommandWithAI(commandText, profile.category);
      const shouldApplyNow = autoApply && result.command.confidence >= 0.5 && canApplyVoiceCommand(result.command);

      if (shouldApplyNow) {
        setParsedCommand(null);
        await applyVoiceCommand(result.command, commandText);
      } else {
        setParsedCommand(result.command);
        setVoiceStatus(
          result.source === "ai"
            ? "حکم سمجھ آ گیا۔ درست ہو تو لاگو کریں۔"
            : "حکم مکمل واضح نہیں۔ درست ہو تو لاگو کریں۔"
        );
      }
    } catch (error) {
      console.error("Voice command error", error);
      setVoiceStatus("کام محفوظ نہیں ہو سکا۔ انٹرنیٹ دیکھ کر دوبارہ کوشش کریں۔");
    } finally {
      setVoiceBusy(false);
    }
  }

  async function applyVoiceCommand(commandOverride?: ParsedVoiceCommand, rawOverride?: string) {
    const command = commandOverride || parsedCommand;
    const rawText = rawOverride || voiceText;
    if (!command) return;
    if (command.action === "CREDIT" && command.amount) {
      const entry: CreditEntry = {
        id: uid("credit"),
        customerName: command.customerName || "گاہک",
        amount: command.amount,
        amountPaid: 0,
        note: rawText,
        createdAt: new Date().toISOString(),
      };
      if (shopId) {
        await saveCredit(shopId, { ...entry, id: "" });
      } else {
        setCredits([entry, ...credits]);
      }
      setVoiceStatus(`${entry.customerName} کا ادھار شامل ہو گیا۔`);
    }
    if (["STOCK_IN", "STOCK_OUT", "SALE"].includes(command.action) && command.itemName && command.qty) {
      const commandItemName = normalizeItemName(command.itemName);
      const match = inventory.find((item) => normalizeItemName(item.nameUrdu) === commandItemName);
      if (match) {
        const delta = command.action === "STOCK_IN" ? command.qty : -command.qty;
        const appliedDelta = await updateStock(match.id, delta, rawText);
        setVoiceStatus(
          appliedDelta === 0
            ? `${command.itemName} کا اسٹاک پہلے ہی صفر ہے۔`
            : `${command.itemName} کا اسٹاک اپڈیٹ ہو گیا۔`
        );
      } else if (command.action === "STOCK_IN") {
        const next: InventoryItem = {
          id: uid("item"),
          nameUrdu: command.itemName,
          qty: command.qty,
          unit: command.unit || "piece",
          sellPrice: 0,
          lowStock: 1,
          updatedAt: new Date().toISOString(),
        };
        if (shopId) {
          await saveInventoryItem(shopId, { ...next, id: "" });
        } else {
          setInventory([next, ...inventory]);
        }
        setVoiceStatus(`${command.itemName} کو نیا آئٹم بنا کر اسٹاک میں شامل کر دیا گیا۔`);
      } else {
        setVoiceStatus(`${command.itemName} اسٹاک میں نہیں ملا۔ پہلے آئٹم شامل کریں۔`);
      }
    } else if (command.action === "UNKNOWN") {
      setVoiceStatus("حکم واضح نہیں ہوا۔ مثال: تین کلو چینی آئی");
    }
    setParsedCommand(null);
    setVoiceText("");
  }

  async function confirmVoiceCommand() {
    setVoiceBusy(true);
    try {
      await applyVoiceCommand();
    } catch (error) {
      console.error("Voice command save error", error);
      setVoiceStatus("کام محفوظ نہیں ہو سکا۔ انٹرنیٹ دیکھ کر دوبارہ کوشش کریں۔");
    } finally {
      setVoiceBusy(false);
    }
  }

  function startVoiceListening() {
    if (voiceListening || voiceBusy) return;

    const SpeechRecognition =
      (window as typeof window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
      (window as typeof window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus("اس براؤزر میں آواز کی سہولت نہیں۔ نیچے حکم لکھ کر کام کریں۔");
      setActiveTab("home");
      return;
    }

    const recognition = new (SpeechRecognition as new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      stop: () => void;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onerror: ((event: { error?: string }) => void) | null;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    })();

    recognition.lang = "ur-PK";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setActiveTab("home");
      setVoiceListening(true);
      setVoiceStatus("سن رہا ہوں۔ اردو میں بولیں۔");
    };
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = (event) => {
      setVoiceListening(false);
      setActiveTab("home");
      setVoiceStatus(micErrorMessage(event.error));
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setVoiceText(transcript);
      setVoiceStatus(`سنا گیا: ${transcript}۔ کام کیا جا رہا ہے...`);
      void parseVoice(transcript, true);
    };
    try {
      recognition.start();
    } catch (error) {
      console.error("Speech recognition start error", error);
      setVoiceListening(false);
      setVoiceStatus("مائیک شروع نہیں ہو سکا۔ اجازت دیکھ کر دوبارہ کوشش کریں۔");
    }
  }

  function clearLocalData() {
    store.clearAll();
    setProfileState(store.getProfile());
    setInventoryState(store.getInventory());
    setCreditsState(store.getCredits());
    setTransactionsState(store.getTransactions());
    setParsedCommand(null);
  }

  if (!authReady) {
    return (
      <div className={`app-shell auth-only ${config.accentClass}`} dir="rtl">
        <main className="workspace">
          <section className="panel loading-panel">لاگ اِن تیار ہو رہا ہے...</section>
        </main>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className={`app-shell auth-only ${config.accentClass}`} dir="rtl">
        <main className="workspace">
          <AuthPanel />
        </main>
      </div>
    );
  }

  return (
    <div className={`app-shell ${config.accentClass} ${!profile.isSetupComplete ? "setup-mode" : ""}`} dir="rtl">
      <aside className="rail" aria-label="نیویگیشن">
        <div className="brand-mark">د</div>
        <NavButton label="گھر" icon={<Home />} active={activeTab === "home"} onClick={() => setActiveTab("home")} />
        <NavButton
          label="اسٹاک"
          icon={<ShoppingBasket />}
          active={activeTab === "inventory"}
          onClick={() => setActiveTab("inventory")}
        />
        <NavButton label="ادھار" icon={<WalletCards />} active={activeTab === "credits"} onClick={() => setActiveTab("credits")} />
        <NavButton
          label="رپورٹ"
          icon={<ChartNoAxesCombined />}
          active={activeTab === "reports"}
          onClick={() => setActiveTab("reports")}
        />
        <NavButton label="سیٹنگ" icon={<Settings />} active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
      </aside>

      <main className="workspace">
        <div className="auth-status">
          <span><strong>{authUser.displayName || authUser.email || "اکاؤنٹ"}</strong> سے لاگ اِن ہے</span>
          <button type="button" onClick={() => void signOut(auth)}>لاگ آؤٹ</button>
        </div>
        {firestoreError && (
          <div className="sync-error">
            ڈیٹا محفوظ کرنے میں مسئلہ: {firestoreError}
          </div>
        )}
        {actionError && <div className="sync-error">{actionError}</div>}
        <header className="topbar">
          <div>
            <p className="eyebrow">{config.title}</p>
            <h1>{profile.name}</h1>
          </div>
          <div className="status-pill">
            <span className="pulse" />
            {profile.isSetupComplete ? "دکان تیار ہے" : "ابتدائی ترتیب باقی ہے"}
          </div>
        </header>

        {!profile.isSetupComplete && (
          <SetupPanel profile={profile} setProfile={setProfile} config={config} />
        )}

        {activeTab === "home" && (
          <section className="screen-grid">
            <div className="hero-panel">
              <div className="hero-copy">
                <div className="hero-kicker">
                  <span>{config.title}</span>
                  <span>{profile.city || "پاکستان"}</span>
                </div>
                <h2>{profile.isSetupComplete ? `${profile.name} کا آج کا کام` : "دکان کی معلومات دیں، پھر کام شروع کریں"}</h2>
                <p>{config.hero}</p>
                <div className="suggestion-row">
                  {config.firstItems.map((item) => (
                    <button key={item} type="button" onClick={() => quickFillItem(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <DukaanScene category={profile.category} />
            </div>

            <section className="workflow-strip" aria-label="تیز کام">
              {config.workflows.map((workflow) => (
                <button className="workflow-button" key={workflow.label} type="button" onClick={() => setActiveTab(workflow.tab)}>
                  {workflow.icon}
                  <span>{workflow.label}</span>
                  <small>{workflow.detail}</small>
                </button>
              ))}
            </section>

            <div className="metrics-row">
              <Metric icon={config.icon} label="کل آئٹمز" value={bilingualNumber(inventory.length)} />
              <Metric icon={<Bell />} label="کم اسٹاک" value={bilingualNumber(lowStockItems.length)} warn={lowStockItems.length > 0} />
              <Metric icon={<WalletCards />} label="باقی ادھار" value={money(totalCredit)} />
              <Metric icon={<ReceiptText />} label="آج کی سیل" value={money(todaySales)} />
            </div>

            <VoicePanel
              voiceText={voiceText}
              setVoiceText={setVoiceText}
              parsedCommand={parsedCommand}
              parseVoice={(commandText) => parseVoice(commandText || voiceText, true)}
              applyVoiceCommand={confirmVoiceCommand}
              startVoiceListening={startVoiceListening}
              hint={config.action}
              status={voiceStatus}
              busy={voiceBusy}
              listening={voiceListening}
            />

            <section className="operator-panel">
              <div className="operator-copy">
                <p className="eyebrow">فوری جائزہ</p>
                <h2>مالک صبح دکان کھولتے ہی یہ تین چیزیں دیکھے</h2>
              </div>
              <div className="operator-steps">
                <div>
                  <strong>{lowStockItems.length ? "کم مال پہلے خریدیں" : "اسٹاک ٹھیک ہے"}</strong>
                  <span>{lowStockItems.length ? `${lowStockItems[0]?.nameUrdu} دوبارہ خریدیں` : "کم اسٹاک کی اطلاع نہیں"}</span>
                </div>
                <div>
                  <strong>{totalCredit ? "ادھار یاد دہانی" : "ادھار صاف"}</strong>
                  <span>{totalCredit ? `${money(totalCredit)} باقی ہے` : "کوئی رقم باقی نہیں"}</span>
                </div>
                <div>
                  <strong>آواز تیار</strong>
                  <span>{config.action}</span>
                </div>
              </div>
            </section>

            <div className="two-col">
              <section className="panel">
                <PanelTitle icon={<Bell />} title="دکان کی اطلاع" />
                <div className="list">
                  {lowStockItems.length === 0 && <EmptyLine text="ابھی کم اسٹاک کی کوئی اطلاع نہیں۔" />}
                  {lowStockItems.map((item) => (
                    <div className="stock-alert" key={item.id}>
                      <span>{item.nameUrdu}</span>
                      <strong>
                        {bilingualNumber(item.qty)} {unitLabel(item.unit)}
                      </strong>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <PanelTitle icon={<ReceiptText />} title="حالیہ کام" />
                <div className="list">
                  {transactions.length === 0 && <EmptyLine text="ابھی کوئی لین دین موجود نہیں۔" />}
                  {transactions.slice(0, 4).map((txn) => (
                    <div className="row-item" key={txn.id}>
                      <span>{txn.itemName}</span>
                      <strong>{money(txn.amount)}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel action-panel">
                <PanelTitle icon={<ClipboardCheck />} title="اگلا کام" />
                <div className="action-list">
                  <button type="button" onClick={() => setActiveTab("inventory")}>
                    <span>پہلا آئٹم شامل کریں</span>
                    <strong>{config.firstItems[0]}</strong>
                  </button>
                  <button type="button" onClick={() => setActiveTab("credits")}>
                    <span>ادھار کھاتا دیکھیں</span>
                    <strong>{money(totalCredit)}</strong>
                  </button>
                  <button type="button" onClick={() => setActiveTab("reports")}>
                    <span>آج کا حساب دیکھیں</span>
                    <strong>{money(todaySales)}</strong>
                  </button>
                </div>
              </section>
            </div>
          </section>
        )}

        {activeTab === "inventory" && (
          <section className="screen-grid">
            <section className="panel">
              <PanelTitle icon={<ShoppingBasket />} title="اسٹاک لسٹ" />
              <div className="search-box">
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="آئٹم تلاش کریں" />
              </div>
              <div className="inventory-list">
                {filteredInventory.length === 0 && <EmptyLine text={`ابھی کوئی آئٹم نہیں۔ ${config.action}۔`} />}
                {filteredInventory.map((item) => (
                  <article className="inventory-card" key={item.id}>
                    <div className="product-avatar">{item.nameUrdu.slice(0, 1)}</div>
                    <div className="product-main">
                      <h3>{item.nameUrdu}</h3>
                      <p>
                        {item.nameEnglish || config.title} · {money(item.sellPrice)}
                      </p>
                      <div className="stock-bar">
                        <span style={{ width: `${Math.min(100, (item.qty / Math.max(item.lowStock * 3, 1)) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="quantity-box">
                      <strong>{bilingualNumber(item.qty)}</strong>
                      <span>{unitLabel(item.unit)}</span>
                    </div>
                    <div className="card-actions">
                      <button aria-label="اسٹاک بڑھائیں" onClick={() => void adjustStockFromButton(item.id, 1)} disabled={actionBusy}>
                        <Plus size={18} />
                      </button>
                      <button aria-label="اسٹاک کم کریں" onClick={() => void adjustStockFromButton(item.id, -1)} disabled={actionBusy}>
                        <Minus size={18} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <PanelTitle icon={<Plus />} title="نیا آئٹم" />
              <form className="form-grid" onSubmit={addItem}>
                <input value={itemForm.nameUrdu} onChange={(event) => setItemForm({ ...itemForm, nameUrdu: event.target.value })} placeholder={config.firstItems[0]} />
                <input value={itemForm.qty} onChange={(event) => setItemForm({ ...itemForm, qty: event.target.value })} inputMode="decimal" placeholder="مقدار" />
                <select value={itemForm.unit} onChange={(event) => setItemForm({ ...itemForm, unit: event.target.value as Unit })}>
                  <option value="piece">عدد</option>
                  <option value="kg">کلو</option>
                  <option value="litre">لیٹر</option>
                  <option value="darjan">درجن</option>
                  <option value="packet">پیکٹ</option>
                </select>
                <input value={itemForm.sellPrice} onChange={(event) => setItemForm({ ...itemForm, sellPrice: event.target.value })} inputMode="decimal" placeholder="فروخت قیمت" />
                <input value={itemForm.lowStock} onChange={(event) => setItemForm({ ...itemForm, lowStock: event.target.value })} inputMode="decimal" placeholder="کم اسٹاک حد" />
                <button className="primary-button" type="submit" disabled={actionBusy}>
                  {actionBusy ? "محفوظ ہو رہا ہے..." : "محفوظ کریں"}
                </button>
              </form>
            </section>
          </section>
        )}

        {activeTab === "credits" && (
          <section className="screen-grid">
            <section className="panel">
              <PanelTitle icon={<WalletCards />} title="ادھار کھاتا" />
              <div className="credit-list">
                {credits.length === 0 && <EmptyLine text="ابھی کوئی ادھار ریکارڈ موجود نہیں۔ نیا ادھار شامل کریں۔" />}
                {credits.map((entry) => {
                  const balance = Math.max(0, entry.amount - entry.amountPaid);
                  return (
                    <article className={balance === 0 ? "credit-card paid" : "credit-card"} key={entry.id}>
                      <div className="customer-avatar">
                        <UserRound size={22} />
                      </div>
                      <div>
                        <h3>{entry.customerName}</h3>
                        <p>
                          {entry.phone || "فون نمبر نہیں"} · {entry.note || "ادھار ریکارڈ"}
                        </p>
                      </div>
                      <strong>{money(balance)}</strong>
                      <button onClick={() => void settleCredit(entry.id)} aria-label="ادھار کلیئر کریں" disabled={actionBusy || balance === 0}>
                        <CheckCircle2 size={18} />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
            <section className="panel">
              <PanelTitle icon={<Plus />} title="نیا ادھار" />
              <form className="form-grid" onSubmit={addCredit}>
                <input value={creditForm.customerName} onChange={(event) => setCreditForm({ ...creditForm, customerName: event.target.value })} placeholder="گاہک کا نام" />
                <input value={creditForm.amount} onChange={(event) => setCreditForm({ ...creditForm, amount: event.target.value })} inputMode="decimal" placeholder="رقم" />
                <input value={creditForm.phone} onChange={(event) => setCreditForm({ ...creditForm, phone: event.target.value })} inputMode="tel" placeholder="فون نمبر" />
                <button className="primary-button" type="submit" disabled={actionBusy}>
                  {actionBusy ? "محفوظ ہو رہا ہے..." : "ادھار شامل کریں"}
                </button>
              </form>
            </section>
          </section>
        )}

        {activeTab === "reports" && (
          <section className="screen-grid">
            <section className="panel report-panel">
              <PanelTitle icon={<ChartNoAxesCombined />} title="دکان رپورٹ" />
              <div className="report-line">
                <span>کل سیل</span>
                <strong>{money(todaySales)}</strong>
              </div>
              <div className="report-line">
                <span>باقی ادھار</span>
                <strong>{money(totalCredit)}</strong>
              </div>
              <div className="report-line">
                <span>کم اسٹاک آئٹمز</span>
                <strong>{bilingualNumber(lowStockItems.length)}</strong>
              </div>
              <p className="urdu-summary">{config.reportHint}</p>
            </section>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="screen-grid">
            <SetupPanel profile={profile} setProfile={setProfile} config={config} compact />
            <section className="panel danger-panel">
              <PanelTitle icon={<Settings />} title="لوکل ڈیٹا" />
              <p className="empty-line">ڈیٹا آپ کے اکاؤنٹ کے ساتھ محفوظ ہو رہا ہے۔ مقامی کاپی صرف تیز لوڈنگ کے لیے رکھی گئی ہے۔</p>
              <button className="secondary-button" type="button" onClick={clearLocalData}>
                مقامی کاپی صاف کریں
              </button>
            </section>
          </section>
        )}
      </main>

      {profile.isSetupComplete && (
        <button className={voiceListening ? "floating-mic listening" : "floating-mic"} onClick={startVoiceListening} disabled={voiceBusy || voiceListening} aria-label="وائس ان پٹ">
          <Mic size={30} />
        </button>
      )}
    </div>
  );
}

function SetupPanel(props: {
  profile: ShopProfile;
  setProfile: (profile: ShopProfile) => void;
  config: (typeof shopConfigs)[ShopCategory];
  compact?: boolean;
}) {
  const { profile, setProfile, config, compact } = props;
  return (
    <section className={compact ? "setup-panel panel compact" : "setup-panel panel"}>
      <div className="setup-heading">
        <div>
          <p className="eyebrow">{compact ? "دکان معلومات" : "ابتدائی ترتیب"}</p>
          <h2>{compact ? "دکان کی معلومات" : "پہلے دکان کی نوعیت بتائیں"}</h2>
        </div>
        <div className="setup-icon">{config.icon}</div>
      </div>
      {!compact && (
        <div className="setup-progress" aria-label="ابتدائی مراحل">
          <span className={profile.name && profile.name !== "آپ کی دکان" ? "done" : ""}>دکان نام</span>
          <span className={profile.category ? "done" : ""}>کام کی قسم</span>
          <span className={profile.ownerPhone ? "done" : ""}>رابطہ نمبر</span>
        </div>
      )}
      <div className="form-grid">
        <input
          value={profile.name}
          onChange={(event) => setProfile({ ...profile, name: event.target.value })}
          placeholder="دکان کا نام"
        />
        <input
          value={profile.city}
          onChange={(event) => setProfile({ ...profile, city: event.target.value })}
          placeholder="شہر: ملتان"
        />
        <input
          className="contact-input"
          value={profile.ownerPhone}
          onChange={(event) => setProfile({ ...profile, ownerPhone: event.target.value })}
          inputMode="tel"
          dir="ltr"
          placeholder="رابطہ نمبر"
        />
        <div className="category-grid">
          {(Object.keys(shopConfigs) as ShopCategory[]).map((category) => (
            <button
              className={profile.category === category ? "category-button active" : "category-button"}
              key={category}
              type="button"
              onClick={() => setProfile({ ...profile, category })}
            >
              {shopConfigs[category].icon}
              <span>{shopConfigs[category].title}</span>
            </button>
          ))}
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => setProfile({ ...profile, isSetupComplete: true })}
        >
          دکان شروع کریں
        </button>
      </div>
    </section>
  );
}

function AuthPanel() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function loginWithGoogle() {
    setBusy(true);
    setStatus("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google login error", error);
      setStatus("گوگل لاگ اِن نہیں ہو سکا۔ Firebase میں اپنا ڈومین شامل کر کے دوبارہ کوشش کریں۔");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-panel panel">
      <div className="auth-copy">
        <p className="eyebrow">اے آئی دکان مینیجر</p>
        <h2>اپنی دکان کا حساب محفوظ رکھیں</h2>
        <p>گوگل اکاؤنٹ سے لاگ اِن کریں۔ اسٹاک، ادھار اور روز کا حساب محفوظ رہے گا۔</p>
        <div className="auth-benefits">
          <span>اردو ڈیش بورڈ</span>
          <span>اسٹاک محفوظ</span>
          <span>ادھار کھاتا</span>
        </div>
      </div>
      <div className="auth-forms">
        <button className="google-button" disabled={busy} type="button" onClick={loginWithGoogle}>
          <span className="google-mark">G</span>
          {busy ? "لاگ اِن ہو رہا ہے..." : "گوگل سے شروع کریں"}
        </button>
        <p className="auth-help">اکاؤنٹ منتخب کریں اور دکان کا کام شروع کریں۔</p>
        {status && <p className="auth-status-text">{status}</p>}
      </div>
    </section>
  );
}

function NavButton(props: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button className={props.active ? "nav-button active" : "nav-button"} onClick={props.onClick} title={props.label}>
      {props.icon}
      <span>{props.label}</span>
    </button>
  );
}

function Metric(props: { icon: React.ReactNode; label: string; value: string; warn?: boolean }) {
  return (
    <article className={props.warn ? "metric warn" : "metric"}>
      <div>{props.icon}</div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

function PanelTitle(props: { icon: React.ReactNode; title: string }) {
  return (
    <div className="panel-title">
      {props.icon}
      <h2>{props.title}</h2>
    </div>
  );
}

function EmptyLine(props: { text: string }) {
  return <p className="empty-line">{props.text}</p>;
}

function VoicePanel(props: {
  voiceText: string;
  setVoiceText: (value: string) => void;
  parsedCommand: ParsedVoiceCommand | null;
  parseVoice: (commandText?: string) => void | Promise<void>;
  applyVoiceCommand: () => void;
  startVoiceListening: () => void;
  hint: string;
  status: string;
  busy: boolean;
  listening: boolean;
}) {
  const quickCommands = ["تین کلو چینی آئی", "دو کلو چینی بک گئی", "گاہک کو پانچ سو ادھار"];

  return (
    <section className="voice-panel">
      <button className={props.listening ? "mic-orb listening" : "mic-orb"} type="button" onClick={props.startVoiceListening} disabled={props.busy || props.listening} aria-label="آواز سے بولیں">
        <Mic size={34} />
      </button>
      <div className="voice-main">
        <p className="eyebrow">آواز سے حکم</p>
        <h2>بول کر دکان اپڈیٹ کریں</h2>
        <p className="voice-hint">{props.hint}</p>
        <div className="voice-input-row">
          <input
            value={props.voiceText}
            onChange={(event) => props.setVoiceText(event.target.value)}
            placeholder="مثال: تین کلو چینی آئی"
            dir="rtl"
          />
          <button onClick={() => void props.parseVoice()} disabled={props.busy}>
            {props.busy ? "کام ہو رہا ہے" : "کام کریں"}
          </button>
        </div>
        <div className="voice-examples" aria-label="فوری حکم">
          {quickCommands.map((command) => (
            <button
              key={command}
              type="button"
              disabled={props.busy}
              onClick={() => {
                props.setVoiceText(command);
                void props.parseVoice(command);
              }}
            >
              {command}
            </button>
          ))}
        </div>
        {props.status && <p className="voice-status">{props.status}</p>}
        {props.parsedCommand && (
          <div className="preview-command">
            <span>{commandActionLabel(props.parsedCommand.action)}</span>
            <strong>{props.parsedCommand.itemName || props.parsedCommand.customerName || "جائزہ درکار"}</strong>
            <em>{Math.round(props.parsedCommand.confidence * 100)}%</em>
            <button onClick={() => props.applyVoiceCommand()} disabled={props.busy}>لگائیں</button>
          </div>
        )}
      </div>
    </section>
  );
}

const rootElement = document.getElementById("root")!;
const appWindow = window as Window & { dukaanRoot?: ReturnType<typeof createRoot> };
appWindow.dukaanRoot ||= createRoot(rootElement);
appWindow.dukaanRoot.render(<App />);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
