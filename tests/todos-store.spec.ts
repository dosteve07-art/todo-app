import { createClient, type Client } from "@libsql/client";
import { expect, test } from "@playwright/test";
import { createTodoStore, EmptyTitleError } from "../lib/todos";

let client: Client;

test.beforeEach(async () => {
  client = createClient({ url: "file::memory:" });
});

test.afterEach(() => {
  client.close();
});

test("a created task can be retrieved from the store", async () => {
  const store = createTodoStore(client);

  const created = await store.create("  Read a book  ");

  expect(created.title).toBe("Read a book");
  expect(await store.list()).toEqual([created]);
});

test("duplicate titles are independent and newest tasks appear first", async () => {
  const store = createTodoStore(client);

  const first = await store.create("Read a book");
  const second = await store.create("Read a book");

  expect(second.id).not.toBe(first.id);
  expect(await store.list()).toEqual([second, first]);
});

test("a blank task title is rejected", async () => {
  const store = createTodoStore(client);

  await expect(store.create("  \n ")).rejects.toBeInstanceOf(EmptyTitleError);
  expect(await store.list()).toEqual([]);
});

test("a task can be completed and returned to active", async () => {
  const store = createTodoStore(client);
  const todo = await store.create("Water the plants");

  await store.setCompleted(todo.id, true);
  expect((await store.list())[0].completed).toBe(true);

  await store.setCompleted(todo.id, false);
  expect((await store.list())[0].completed).toBe(false);
});

test("a task can be permanently deleted", async () => {
  const store = createTodoStore(client);
  const todo = await store.create("Water the plants");

  expect(await store.delete(todo.id)).toBe(true);
  expect(await store.list()).toEqual([]);
  expect(await store.delete(todo.id)).toBe(false);
});

test("a task title can be edited without accepting a blank replacement", async () => {
  const store = createTodoStore(client);
  const todo = await store.create("Old title");

  const updated = await store.updateTitle(todo.id, "  New title  ");
  expect(updated?.title).toBe("New title");

  await expect(store.updateTitle(todo.id, "   ")).rejects.toBeInstanceOf(
    EmptyTitleError,
  );
  expect(await store.list()).toEqual([updated]);
});
