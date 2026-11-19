"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Todo } from "@/lib/todos";

type TodoChange = { title: string } | { completed: boolean };

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyTodoId, setBusyTodoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTodos() {
      try {
        const response = await fetch("/api/todos", { cache: "no-store" });
        const result: unknown = await response.json();

        if (!response.ok) {
          throw new Error(readError(result, "할 일을 불러오지 못했습니다."));
        }
        if (!isTodoList(result)) {
          throw new Error("서버 응답을 확인할 수 없습니다.");
        }

        if (active) {
          setTodos(result);
          setLoadFailed(false);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setLoadFailed(true);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "할 일을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadTodos();
    return () => {
      active = false;
    };
  }, []);

  async function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setError("할 일 제목을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: normalizedTitle }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readError(result, "할 일을 추가하지 못했습니다."));
      }
      if (!isTodo(result)) {
        throw new Error("서버 응답을 확인할 수 없습니다.");
      }

      setTodos((current) => [result, ...current]);
      setTitle("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "할 일을 추가하지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateTodo(id: string, change: TodoChange) {
    setBusyTodoId(id);
    setError(null);

    try {
      const response = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readError(result, "할 일을 수정하지 못했습니다."));
      }
      if (!isTodo(result)) {
        throw new Error("서버 응답을 확인할 수 없습니다.");
      }

      setTodos((current) =>
        current.map((todo) => (todo.id === id ? result : todo)),
      );
      return true;
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "할 일을 수정하지 못했습니다.",
      );
      return false;
    } finally {
      setBusyTodoId(null);
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const normalizedTitle = editTitle.trim();
    if (!normalizedTitle) {
      setError("할 일 제목을 입력해 주세요.");
      return;
    }

    if (await updateTodo(id, { title: normalizedTitle })) {
      setEditingId(null);
      setEditTitle("");
    }
  }

  async function deleteTodo(id: string) {
    setBusyTodoId(id);
    setError(null);

    try {
      const response = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result: unknown = await response.json();
        throw new Error(readError(result, "할 일을 삭제하지 못했습니다."));
      }

      setTodos((current) => current.filter((todo) => todo.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setEditTitle("");
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "할 일을 삭제하지 못했습니다.",
      );
    } finally {
      setBusyTodoId(null);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setError(null);
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      cancelEdit();
    }
  }

  const activeTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);

  function renderTodo(todo: Todo) {
    const isEditing = editingId === todo.id;
    const isBusy = busyTodoId === todo.id;

    return (
      <li
        className="flex items-start gap-3 py-4 text-slate-800"
        key={todo.id}
      >
        <input
          aria-label={`${todo.title} 완료`}
          checked={todo.completed}
          className="mt-1 size-4 accent-indigo-600"
          disabled={isBusy}
          onChange={(event) => {
            void updateTodo(todo.id, { completed: event.target.checked });
          }}
          type="checkbox"
        />
        {isEditing ? (
          <form
            className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              void saveEdit(event, todo.id);
            }}
          >
            <label className="sr-only" htmlFor={`edit-${todo.id}`}>
              할 일 제목 수정
            </label>
            <input
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              id={`edit-${todo.id}`}
              onChange={(event) => setEditTitle(event.target.value)}
              onKeyDown={handleEditKeyDown}
              value={editTitle}
            />
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                disabled={isBusy}
                type="submit"
              >
                저장
              </button>
              <button
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                onClick={cancelEdit}
                type="button"
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <>
            <span
              className={`min-w-0 flex-1 break-words ${
                todo.completed ? "text-slate-400 line-through" : ""
              }`}
            >
              {todo.title}
            </span>
            <div className="flex shrink-0 gap-1">
              <button
                aria-label={`${todo.title} 수정`}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
                disabled={isBusy}
                onClick={() => {
                  setEditingId(todo.id);
                  setEditTitle(todo.title);
                  setError(null);
                }}
                type="button"
              >
                수정
              </button>
              <button
                aria-label={`${todo.title} 삭제`}
                className="rounded-lg px-2 py-1 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                disabled={isBusy}
                onClick={() => {
                  void deleteTodo(todo.id);
                }}
                type="button"
              >
                삭제
              </button>
            </div>
          </>
        )}
      </li>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-16">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold tracking-[0.18em] text-indigo-600">
          DAILY
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          나의 할 일
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          하나씩 정리하고, 차근차근 완료해 보세요.
        </p>

        <form
          className="mt-8 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            void addTodo(event);
          }}
        >
          <label className="sr-only" htmlFor="new-todo">
            새 할 일
          </label>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            id="new-todo"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="무엇을 해야 하나요?"
            value={title}
          />
          <button
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting || loading || loadFailed}
            type="submit"
          >
            {submitting ? "추가 중..." : "추가"}
          </button>
        </form>

        {error && (
          <p
            className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
          >
            {error}
          </p>
        )}

        {!loadFailed && (
          <>
            <TodoSection
              className="mt-10"
              count={activeTodos.length}
              emptyMessage="아직 할 일이 없어요. 새로운 할 일을 추가해 보세요."
              isLoading={loading}
              label="진행 중"
            >
              {activeTodos.map(renderTodo)}
            </TodoSection>

            <TodoSection
              className="mt-8"
              count={completedTodos.length}
              emptyMessage="완료한 할 일이 없어요."
              isLoading={loading}
              label="완료"
            >
              {completedTodos.map(renderTodo)}
            </TodoSection>
          </>
        )}
      </section>
    </main>
  );
}

function TodoSection({
  children,
  className,
  count,
  emptyMessage,
  isLoading,
  label,
}: {
  children: ReactNode;
  className: string;
  count: number;
  emptyMessage: string;
  isLoading: boolean;
  label: string;
}) {
  const headingId =
    label === "완료" ? "completed-todos-heading" : "active-todos-heading";

  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h2 className="text-lg font-semibold text-slate-900" id={headingId}>
          {label}
        </h2>
        <span className="text-sm text-slate-500">{count}개</span>
      </div>
      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-500" role="status">
          불러오는 중...
        </p>
      ) : count > 0 ? (
        <ul className="divide-y divide-slate-100">{children}</ul>
      ) : (
        <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>
      )}
    </section>
  );
}

function readError(value: unknown, fallback: string): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }
  return fallback;
}

function isTodo(value: unknown): value is Todo {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "completed" in value &&
    typeof value.completed === "boolean" &&
    "createdAt" in value &&
    typeof value.createdAt === "number"
  );
}

function isTodoList(value: unknown): value is Todo[] {
  return Array.isArray(value) && value.every(isTodo);
}
