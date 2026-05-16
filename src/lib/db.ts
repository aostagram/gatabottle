import { createClient, type Client } from "@libsql/client";

declare global {
  // eslint-disable-next-line no-var
  var __libsqlClient: Client | undefined;
}

function buildClient(): Client {
  const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return createClient({ url, authToken });
}

export const db: Client = globalThis.__libsqlClient ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__libsqlClient = db;
}
