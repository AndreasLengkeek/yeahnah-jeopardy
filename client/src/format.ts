export function formatScore(score: number): string {
  const amount = Math.abs(score).toLocaleString("en-US");
  return score < 0 ? `-$${amount}` : `$${amount}`;
}
