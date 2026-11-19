import { randomUUID } from "node:crypto";
import type { Client, Row } from "@libsql/client";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
};

export class EmptyTitleError extends Error {
  constructor() {
    super("A task title cannot be empty.");
    this.name = "EmptyTitleError";
  }
}

export function createTodoStore(client: Client) {
  let initialized: Promise<void> | undefined;

  async function ensureTable() {
    initialized ??= client
      .execute(
        `CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        )`,
      )
      .then(() => undefined);
    await initialized;
  }

  return {
    async create(title: string): Promise<Todo> {
      const normalizedTitle = title.trim();
      if (!normalizedTitle) {
        throw new EmptyTitleError();
      }

      await ensureTable();
      const todo: Todo = {
        id: randomUUID(),
        title: normalizedTitle,
        completed: false,
        createdAt: Date.now(),
      };

      await client.execute({
        sql: "INSERT INTO todos (id, title, completed, created_at) VALUES (?, ?, ?, ?)",
        args: [todo.id, todo.title, 0, todo.createdAt],
      });

      return todo;
    },

    async list(): Promise<Todo[]> {
      await ensureTable();
      const result = await client.execute(
        "SELECT id, title, completed, created_at FROM todos ORDER BY created_at DESC, rowid DESC",
      );
      return result.rows.map(mapTodo);
    },

    async updateTitle(id: string, title: string): Promise<Todo | null> {
      const normalizedTitle = title.trim();
      if (!normalizedTitle) {
        throw new EmptyTitleError();
      }

      await ensureTable();
      const result = await client.execute({
        sql: "UPDATE todos SET title = ? WHERE id = ?",
        args: [normalizedTitle, id],
      });
      if (result.rowsAffected === 0) {
        return null;
      }
      return findTodo(client, id);
    },

    async setCompleted(id: string, completed: boolean): Promise<Todo | null> {
      await ensureTable();
      const result = await client.execute({
        sql: "UPDATE todos SET completed = ? WHERE id = ?",
        args: [completed ? 1 : 0, id],
      });
      if (result.rowsAffected === 0) {
        return null;
      }
      return findTodo(client, id);
    },

    async delete(id: string): Promise<boolean> {
      await ensureTable();
      const result = await client.execute({
        sql: "DELETE FROM todos WHERE id = ?",
        args: [id],
      });
      return result.rowsAffected > 0;
    },
  };
}

async function findTodo(client: Client, id: string): Promise<Todo | null> {
  const result = await client.execute({
    sql: "SELECT id, title, completed, created_at FROM todos WHERE id = ?",
    args: [id],
  });
  return result.rows[0] ? mapTodo(result.rows[0]) : null;
}

function mapTodo(row: Row): Todo {
  return {
    id: String(row.id),
    title: String(row.title),
    completed: Number(row.completed) === 1,
    createdAt: Number(row.created_at),
  };
}
