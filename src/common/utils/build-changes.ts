export function normalize(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return [...value].sort().join(', ') || '—';
  return String(value);
}

export function buildChanges(
  before: Record<string, any>,
  after: Record<string, any>,
  labels: Record<string, string>,
): string[] {
  const changes: string[] = [];

  for (const [key, label] of Object.entries(labels)) {
    if (!(key in after) || after[key] === undefined) continue;

    const oldVal = normalize(before[key]);
    const newVal = normalize(after[key]);

    if (oldVal !== newVal) changes.push(`${label}: ${oldVal} → ${newVal}`);
  }

  return changes;
}
