import { http, HttpResponse } from "msw";

const TASKS_URL = "http://localhost:3000/tasks";

export const mockTask = {
  id: 1,
  title: "Buy groceries",
  isCompleted: false,
  createdAt: "2026-04-29T10:00:00.000Z",
};

export const handlers = [
  http.get(TASKS_URL, () => {
    return HttpResponse.json({ data: [mockTask] });
  }),

  http.post(TASKS_URL, async ({ request }) => {
    const body = (await request.json()) as { title: string };
    return HttpResponse.json(
      {
        data: {
          id: 99,
          title: body.title,
          isCompleted: false,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  }),

  // Handles both edit (sends { title }) and complete (sends { completed }) mutations.
  // Maps request's `completed` field → response's `isCompleted` field.
  http.patch(`${TASKS_URL}/:id`, async ({ request }) => {
    const body = (await request.json()) as {
      title?: string;
      completed?: boolean;
    };
    const { completed, title, ...rest } = body;
    return HttpResponse.json({
      data: {
        ...mockTask,
        ...rest,
        ...(title !== undefined && { title }),
        ...(completed !== undefined && { isCompleted: completed }),
      },
    });
  }),

  http.delete(`${TASKS_URL}/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
