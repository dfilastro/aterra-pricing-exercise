const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const moneyWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function usd(n: number): string {
  return moneyFmt.format(n);
}

export function usdWhole(n: number): string {
  return moneyWhole.format(Math.round(n));
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function pctPoints(n: number, digits = 0): string {
  const v = n.toFixed(digits);
  return `${v}%`;
}
