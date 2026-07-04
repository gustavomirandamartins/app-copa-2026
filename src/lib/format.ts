/** Formata percentual com 1 casa decimal e vírgula (pt-BR): 3.7 → "3,7". */
export function formatPct(n: number): string {
  return n.toFixed(1).replace('.', ',');
}
