/**
 * Map domain / DB failures to product copy. Never return raw SQL to clients.
 * Full errors are logged for debugging.
 */

function collectErrorText(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  let depth = 0;
  while (current != null && depth < 6) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
      depth += 1;
      continue;
    }
    if (typeof current === "object") {
      const rec = current as Record<string, unknown>;
      if (typeof rec.message === "string") parts.push(rec.message);
      if (typeof rec.code === "string" || typeof rec.code === "number") {
        parts.push(String(rec.code));
      }
      if (typeof rec.constraint === "string") parts.push(rec.constraint);
      if (typeof rec.detail === "string") parts.push(rec.detail);
      current = rec.cause;
      depth += 1;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join(" | ");
}

function looksLikeDatabaseDump(message: string): boolean {
  return /(violates|constraint|duplicate key|unique constraint|SQLSTATE|Failed query|drizzle|postgres|neon\.tech|ECONN|syntax error|relation "|column )/i.test(
    message,
  );
}

export function clientSafeCustomCategoryError(
  err: unknown,
  fallback: string,
): string {
  const text = collectErrorText(err);
  console.error("[custom-categories]", err);

  if (
    text.includes("community_custom_categories_edition_name_uidx") ||
    (/duplicate key/i.test(text) &&
      /community_custom_categories/i.test(text))
  ) {
    return "A community category with that name already exists.";
  }
  if (
    text.includes("community_custom_category_entries_title_uidx") ||
    (/duplicate key/i.test(text) &&
      /community_custom_category_entries/i.test(text))
  ) {
    return "An entry with that title already exists in this category.";
  }
  if (/23505/.test(text) && /game_id|gameId/i.test(text)) {
    return "That game is already an entry in this category.";
  }

  if (err instanceof Error) {
    const msg = err.message.trim();
    if (msg && msg.length <= 180 && !looksLikeDatabaseDump(msg)) {
      return msg;
    }
  }

  return fallback;
}
