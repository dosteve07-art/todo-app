import { EmptyTitleError } from "@/lib/todos";
import { getTodoStore } from "@/lib/database";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "올바른 요청 형식이 아닙니다." },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { error: "변경할 내용을 확인해 주세요." },
      { status: 400 },
    );
  }

  const hasTitle = Object.hasOwn(body, "title");
  const hasCompleted = Object.hasOwn(body, "completed");
  if (hasTitle === hasCompleted) {
    return Response.json(
      { error: "제목 또는 완료 상태 중 하나를 변경해 주세요." },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    if (hasTitle) {
      if (typeof body.title !== "string") {
        return Response.json(
          { error: "할 일 제목을 입력해 주세요." },
          { status: 400 },
        );
      }

      const todo = await getTodoStore().updateTitle(id, body.title);
      if (!todo) {
        return Response.json(
          { error: "할 일을 찾을 수 없습니다." },
          { status: 404 },
        );
      }
      return Response.json(todo);
    }

    if (typeof body.completed !== "boolean") {
      return Response.json(
        { error: "완료 상태를 확인해 주세요." },
        { status: 400 },
      );
    }

    const todo = await getTodoStore().setCompleted(id, body.completed);
    if (!todo) {
      return Response.json(
        { error: "할 일을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    return Response.json(todo);
  } catch (error) {
    if (error instanceof EmptyTitleError) {
      return Response.json(
        { error: "할 일 제목을 입력해 주세요." },
        { status: 400 },
      );
    }

    console.error("Failed to update task.", error);
    return Response.json(
      { error: "할 일을 수정하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const deleted = await getTodoStore().delete(id);
    if (!deleted) {
      return Response.json(
        { error: "할 일을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete task.", error);
    return Response.json(
      { error: "할 일을 삭제하지 못했습니다." },
      { status: 500 },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
