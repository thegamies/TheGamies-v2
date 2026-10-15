export const TGA_SLOT_MAX = 255;

export type MaskCategory = {
  id: string;
  slot: number;
  nominees: Array<{ id: string; slot: number }>;
};

export type PickCountDelta = {
  categoryId: string;
  nomineeId: string;
  delta: number;
};

function slotInRange(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 1 && slot <= TGA_SLOT_MAX;
}

/** Award slot is the byte index. The byte is the nominee slot. 0 means no pick. */
export function encodeBallotMask(
  categories: MaskCategory[],
  picks: Record<string, string>,
): Uint8Array {
  let maxSlot = 0;
  const categoryById = new Map<string, MaskCategory>();
  for (const category of categories) {
    if (category.slot > maxSlot) maxSlot = category.slot;
    categoryById.set(category.id, category);
  }
  const mask = new Uint8Array(Math.min(Math.max(maxSlot, 0), TGA_SLOT_MAX) + 1);
  for (const [categoryId, nomineeId] of Object.entries(picks)) {
    const category = categoryById.get(categoryId);
    if (!category || !slotInRange(category.slot)) continue;
    const nominee = category.nominees.find((row) => row.id === nomineeId);
    if (!nominee || !slotInRange(nominee.slot)) continue;
    mask[category.slot] = nominee.slot;
  }
  return mask;
}

export function maskBytes(value: unknown): Uint8Array | null {
  if (value == null) return null;
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string") {
    const hex = value.startsWith("\\x") ? value.slice(2) : value;
    if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) return null;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  return null;
}

export function decodeBallotMask(
  value: unknown,
  categories: MaskCategory[],
): Record<string, string> {
  const mask = maskBytes(value);
  if (!mask) return {};
  const picks: Record<string, string> = {};
  for (const category of categories) {
    if (!slotInRange(category.slot) || category.slot >= mask.length) continue;
    const nomineeSlot = mask[category.slot] ?? 0;
    if (!nomineeSlot) continue;
    const nominee = category.nominees.find((row) => row.slot === nomineeSlot);
    if (nominee) picks[category.id] = nominee.id;
  }
  return picks;
}

export function pickCountDeltas(
  previous: Record<string, string>,
  next: Record<string, string>,
): PickCountDelta[] {
  const deltas: PickCountDelta[] = [];
  const categoryIds = new Set([
    ...Object.keys(previous),
    ...Object.keys(next),
  ]);
  for (const categoryId of categoryIds) {
    const before = previous[categoryId];
    const after = next[categoryId];
    if (before === after) continue;
    if (before) deltas.push({ categoryId, nomineeId: before, delta: -1 });
    if (after) deltas.push({ categoryId, nomineeId: after, delta: 1 });
  }
  return deltas;
}
