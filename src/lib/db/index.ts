import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

declare global {
  var __hireloopDbClient: ReturnType<typeof postgres> | undefined;
}

function getClient(): ReturnType<typeof postgres> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalThis.__hireloopDbClient) {
    globalThis.__hireloopDbClient = postgres(databaseUrl, { prepare: false });
  }
  return globalThis.__hireloopDbClient;
}

export const db = (): ReturnType<typeof drizzle<typeof schema>> =>
  drizzle(getClient(), { schema });

export { schema };
