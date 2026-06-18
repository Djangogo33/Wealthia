export function formatEUR(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}
export function formatSigned(n: number) {
  const s = formatEUR(Math.abs(n));
  return n >= 0 ? `+${s}` : `-${s}`;
}
