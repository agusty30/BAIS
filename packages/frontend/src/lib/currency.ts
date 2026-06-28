export type CurrencyCode = 'IDR' | 'USD';

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
};

export const BASE_CURRENCY: CurrencyCode = 'IDR';
export const EXCHANGE_RATE_DATE = '2026-06-28';

export function formatCurrency(cents: number, currencyCode: CurrencyCode = 'IDR'): string {
  const config = CURRENCIES[currencyCode];

  const baseAmount = cents / 100;
  const converted = currencyCode === BASE_CURRENCY
    ? baseAmount
    : baseAmount / config.rate;

  if (currencyCode === 'IDR') {
    return `Rp ${Math.round(converted).toLocaleString('id-ID')}`;
  }

  return `$${converted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
