import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CurrencyCode } from '../lib/currency';

interface CurrencyState {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: 'IDR',
      setCurrency: (currency) => set({ currency }),
    }),
    { name: 'bais-currency' },
  ),
);
