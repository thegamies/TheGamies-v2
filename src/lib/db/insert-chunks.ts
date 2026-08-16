/** Insert rows in chunks so Neon HTTP queries stay under payload limits. */
export async function insertInChunks<T>(
  rows: T[],
  write: (chunk: T[]) => Promise<unknown>,
  chunkSize = 200,
): Promise<void> {
  const size = Math.max(1, Math.floor(chunkSize));
  for (let i = 0; i < rows.length; i += size) {
    await write(rows.slice(i, i + size));
  }
}
