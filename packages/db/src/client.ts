import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { meteredNeonFetch } from "./request-cost";
import * as schema from "./schema";

neonConfig.fetchFunction = meteredNeonFetch;

export type Db = ReturnType<typeof createDb>;

export function createDb(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}
