import { defineStore } from "pinia";
import { ref } from "vue";

const STORAGE_KEY = "point_of_sale_store_settings";

export interface StoreSettings {
  storeName: string;
  ownerName: string;
  cashierName: string;
  address: string;
  phone: string;
  receiptFooter: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Toko Sumber Rejeki",
  ownerName: "",
  cashierName: "Kasir",
  address: "Jl. Sembako Raya No. 88, Manado",
  phone: "",
  receiptFooter:
    "*** TERIMA KASIH ***\nBarang yang sudah dibeli tidak dapat ditukar.",
};

export const useStoreSettingsStore = defineStore("storeSettings", () => {
  const settings = ref<StoreSettings>(loadSettings());

  function loadSettings(): StoreSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (err) {
      console.error(err);
    }
    return { ...DEFAULT_SETTINGS };
  }

  function updateSettings(newSettings: Partial<StoreSettings>) {
    settings.value = { ...settings.value, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    } catch (err) {
      console.error(err);
    }
  }

  function resetSettings(storeName?: string, ownerName?: string, phone?: string) {
    settings.value = {
      ...DEFAULT_SETTINGS,
      ...(storeName ? { storeName } : {}),
      ...(ownerName ? { ownerName } : {}),
      ...(phone ? { phone } : {}),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    } catch (err) {
      console.error(err);
    }
  }

  return { settings, updateSettings, resetSettings };
});
