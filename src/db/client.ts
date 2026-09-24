import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { serverConfig } from "@/lib/config";
import * as schema from "./schema";

// Cache the HTTP query function across hot reloads and warm serverless
// invocations. neon-http is stateless (one HTTPS request per query), which
// suits Vercel's serverless runtime.
const globalForDb = globalThis as unknown as {
  __neonSql?: ReturnType<typeof neon>;
};

const sql = globalForDb.__neonSql ?? neon(serverConfig.databaseUrl());
if (process.env.NODE_ENV !== "production") {
  globalForDb.__neonSql = sql;
}

export const db = drizzle(sql, { schema });
export { schema };
export type DB = typeof db;
