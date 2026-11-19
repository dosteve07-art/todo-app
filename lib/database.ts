import { createClient } from "@libsql/client";
import { createTodoStore } from "@/lib/todos";

let store: ReturnType<typeof createTodoStore> | undefined;

export function getTodoStore() {
  if (store) {
    return store;
  }

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not configured.");
  }

  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url.startsWith("file:") && !authToken) {
    throw new Error("TURSO_AUTH_TOKEN is required for a remote database.");
  }

  store = createTodoStore(
    createClient({
      url,
      authToken: authToken || undefined,
    }),
  );
  return store;
}
