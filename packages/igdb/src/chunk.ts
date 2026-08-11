/** Stay under Postgres / Neon bind-param and payload limits. */
export const INSERT_CHUNK = 500;

export async function insertChunked<T extends Record<string, unknown>>(
  values: T[],
  insert: (chunk: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < values.length; i += INSERT_CHUNK) {
    const chunk = values.slice(i, i + INSERT_CHUNK);
    if (chunk.length) await insert(chunk);
  }
}
