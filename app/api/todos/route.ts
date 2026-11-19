import { EmptyTitleError } from "@/lib/todos";
import { getTodoStore } from "@/lib/database";

export async function GET() {
  try {
    const todos = await getTodoStore().list();
    return Response.json(todos);
  } catch (error) {
    console.error("Failed to load tasks.", error);
    return Response.json(
      { error: "할 일을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "올바른 요청 형식이 아닙니다." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("title" in body) ||
    typeof body.title !== "string"
  ) {
    return Response.json(
      { error: "할 일 제목을 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    const todo = await getTodoStore().create(body.title);
    return Response.json(todo, { status: 201 });
  } catch (error) {
    if (error instanceof EmptyTitleError) {
      return Response.json(
        { error: "할 일 제목을 입력해 주세요." },
        { status: 400 },
      );
    }

    console.error("Failed to create task.", error);
    return Response.json(
      { error: "할 일을 추가하지 못했습니다." },
      { status: 500 },
    );
  }
}
