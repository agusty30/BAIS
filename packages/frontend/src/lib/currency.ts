export type CurrencyCode = 'IDR' | 'USD' | 'SGD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
  rate: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  IDR: {
    code: 'IDR',
    symbol: 'Rp',
    name: 'Indonesian Rupiah',
    locale: 'id-ID',
    decimals: 0,
    rate: 1,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    decimals: 2,
    rate: 16_300,
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    locale: 'en-SG',
    decimals: 2,
    rate: 12_100,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    decimals: 2,
    rate: 17_800,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    decimals: 2,
    rate: 20_700,
  },
};

export const BASE_CURRENCY: CurrencyCode = 'IDR';
export const EXCHANGE_RATE_DATE = '2026-06-30';

export function formatCurrency(cents: number, currencyCode: CurrencyCode = 'IDR'): string {
  const config = CURRENCIES[currencyCode];

  const baseAmount = cents / 100;
  const converted = currencyCode === BASE_CURRENCY
    ? baseAmount
    : baseAmount / config.rate;

  if (config.decimals === 0) {
    return `${config.symbol} ${Math.round(converted).toLocaleString(config.locale)}`;
  }

  return `${config.symbol}${converted.toLocaleString(config.locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  })}`;
}

export function parseCurrencyInput(text: string, currencyCode: CurrencyCode = 'IDR'): number {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val) || val <= 0) return 0;

  if (currencyCode === 'IDR') {
    return Math.round(val * 100);
  }
  const config = CURRENCIES[currencyCode];
  return Math.round(val * config.rate * 100);
}

export function formatCurrencyInput(cents: number, currencyCode: CurrencyCode = 'IDR'): string {
  if (cents <= 0) return '';
  if (currencyCode === 'IDR') {
    return String(cents / 100);
  }
  const config = CURRENCIES[currencyCode];
  return (cents / 100 / config.rate).toFixed(config.decimals);
}

export function formatCurrencyShort(cents: number, currencyCode: CurrencyCode = 'IDR'): string {
  const config = CURRENCIES[currencyCode];
  const baseAmount = cents / 100;
  const converted = currencyCode === BASE_CURRENCY
    ? baseAmount
    : baseAmount / config.rate;

  const abs = Math.abs(converted);
  const sign = converted < 0 ? '-' : '';

  if (abs >= 1_000_000_000) return `${sign}${config.symbol}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${config.symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${config.symbol}${(abs / 1_000).toFixed(1)}K`;
  return formatCurrency(cents, currencyCode);
}
