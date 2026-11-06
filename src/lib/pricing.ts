// Booking lengths and how they're priced. Safe to use on the server and in the browser.

/** Lengths a booking can be, in minutes: 30 min, 1 h, 1½ h, 2 h, 3 h, 4 h. */
export const DURATIONS = [30, 60, 90, 120, 180, 240] as const;

export const isDuration = (d: number): boolean => (DURATIONS as readonly number[]).includes(d);

export type PriceTable = { price_30: number; price_60: number; deposit_30: number; deposit_60: number };

/**
 * Price and deposit for any length, built from the 30- and 60-minute prices in Settings:
 * every full hour costs the 60-minute price, and a leftover half hour the 30-minute price.
 * With the defaults (200 / 400 EGP): 1½ h = 600, 2 h = 800, 3 h = 1,200, 4 h = 1,600.
 */
export function priceFor(p: PriceTable, duration: number): { total: number; deposit: number } {
  const hours = Math.floor(duration / 60);
  const half = duration % 60 ? 1 : 0;
  return {
    total: hours * p.price_60 + half * p.price_30,
    deposit: hours * p.deposit_60 + half * p.deposit_30,
  };
}
