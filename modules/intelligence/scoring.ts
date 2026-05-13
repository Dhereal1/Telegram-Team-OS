export function clampScore(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function severityFromScore(score: number): "INFO" | "WARNING" | "CRITICAL" {
  const s = clampScore(score);
  if (s >= 80) return "CRITICAL";
  if (s >= 50) return "WARNING";
  return "INFO";
}

