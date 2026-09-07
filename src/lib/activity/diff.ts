/** Membership-only diffs. Rank-only reshuffles are empty. */
export function diffListGameIds(
  oldIds: readonly string[],
  newIds: readonly string[],
): { added: string[]; removed: string[] } {
  const before = new Set(oldIds);
  const after = new Set(newIds);
  const added: string[] = [];
  const removed: string[] = [];
  for (const id of after) {
    if (!before.has(id)) added.push(id);
  }
  for (const id of before) {
    if (!after.has(id)) removed.push(id);
  }
  return { added, removed };
}
