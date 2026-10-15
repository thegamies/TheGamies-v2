import { createDb, type Db } from "@thegamies/db";
import { integrationDatabaseUrl } from "./guard";

let db: Db | null = null;

/** The marker check runs once in global setup before any test file loads. */
export function integrationDb(): Db {
  if (db) return db;
  const url = integrationDatabaseUrl(process.env);
  if (!url) throw new Error("Integration database URL is missing.");
  db = createDb(url);
  return db;
}
