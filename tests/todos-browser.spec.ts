import { expect, test } from "@playwright/test";

test("a user can add a task and still see it after reloading", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "나의 할 일" }),
  ).toBeVisible();
  await expect(
    page.getByText("아직 할 일이 없어요. 새로운 할 일을 추가해 보세요.", {
      exact: true,
    }),
  ).toBeVisible();

  const titleInput = page.getByRole("textbox", { name: "새 할 일" });
  await titleInput.fill("책 읽기");
  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/api/todos"),
  );
  await page.getByRole("button", { name: "추가" }).click();
  const response = await createResponse;
  expect(response.status(), await response.text()).toBe(201);

  await expect(page.getByText("책 읽기", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("책 읽기", { exact: true })).toBeVisible();
});

test("blank titles are rejected and Enter submits a valid task", async ({
  page,
}) => {
  await page.goto("/");

  const titleInput = page.getByRole("textbox", { name: "새 할 일" });
  const addButton = page.getByRole("button", { name: "추가" });
  await expect(addButton).toBeEnabled();

  await titleInput.fill("   ");
  await titleInput.press("Enter");
  await expect(
    page.getByText("할 일 제목을 입력해 주세요.", { exact: true }),
  ).toBeVisible();

  const taskTitle = `Enter로 추가-${Date.now()}`;
  await titleInput.fill(taskTitle);
  const createResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/api/todos"),
  );
  await titleInput.press("Enter");

  const response = await createResponse;
  expect(response.status(), await response.text()).toBe(201);
  await expect(page.getByText(taskTitle, { exact: true })).toBeVisible();
});

test("the task screen fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "나의 할 일" }),
  ).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("a database error is not presented as an empty list", async ({ page }) => {
  await page.route("**/api/todos", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "할 일을 불러오지 못했습니다." }),
    }),
  );
  await page.goto("/");

  await expect(
    page.getByText("할 일을 불러오지 못했습니다.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("아직 할 일이 없어요. 새로운 할 일을 추가해 보세요.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "추가" })).toBeDisabled();
});

test("a user can complete, reactivate, edit, and delete a task", async ({
  page,
}) => {
  await page.goto("/");

  const taskTitle = `정리하기-${Date.now()}`;
  await page.getByRole("textbox", { name: "새 할 일" }).fill(taskTitle);
  await page.getByRole("button", { name: "추가" }).click();

  const activeSection = page.getByRole("region", { name: "진행 중" });
  let task = activeSection.getByRole("listitem").filter({ hasText: taskTitle });
  const completionResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes("/api/todos/"),
  );
  await task.getByRole("checkbox", { name: `${taskTitle} 완료` }).click();
  const response = await completionResponse;
  expect(response.status(), await response.text()).toBe(200);

  const completedSection = page.getByRole("region", { name: "완료" });
  task = completedSection.getByRole("listitem").filter({ hasText: taskTitle });
  await expect(task).toBeVisible();
  await task.getByRole("checkbox", { name: `${taskTitle} 완료` }).click();

  task = activeSection.getByRole("listitem").filter({ hasText: taskTitle });
  await task.getByRole("button", { name: `${taskTitle} 수정` }).click();
  const editor = page.getByRole("textbox", { name: "할 일 제목 수정" });
  await editor.fill("   ");
  await editor.press("Enter");
  await expect(
    page.getByText("할 일 제목을 입력해 주세요.", { exact: true }),
  ).toBeVisible();
  await expect(editor).toBeVisible();

  await editor.fill("  읽은 책 기록하기  ");
  await editor.press("Enter");

  task = activeSection
    .getByRole("listitem")
    .filter({ hasText: "읽은 책 기록하기" });
  await expect(task).toBeVisible();
  await task
    .getByRole("button", { name: "읽은 책 기록하기 삭제" })
    .click();

  await page.reload();
  await expect(
    page.getByText("읽은 책 기록하기", { exact: true }),
  ).toHaveCount(0);
});
