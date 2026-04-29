import { describe, it, expect } from "vitest";
import { delay } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "./mocks/server";
import { mockTask } from "./mocks/handlers";
import { TaskApp } from "./App";

function renderTaskApp() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <TaskApp />
    </QueryClientProvider>,
  );
}

describe("TaskApp", () => {
  // ── Initial render ──────────────────────────────────────────────────────────

  describe("initial render", () => {
    it("shows 'No tasks yet.' when GET /tasks returns empty list", async () => {
      server.use(
        http.get("http://localhost:3000/tasks", () =>
          HttpResponse.json({ data: [] }),
        ),
      );
      renderTaskApp();
      await screen.findByText("No tasks yet.");
    });

    it("renders task list populated from GET /tasks", async () => {
      renderTaskApp();
      await screen.findByText("Buy groceries");
    });

    it("shows inline error message when GET /tasks fails", async () => {
      server.use(
        http.get("http://localhost:3000/tasks", () =>
          HttpResponse.json(
            { error: { code: "SERVER_ERROR", message: "oops" } },
            { status: 500 },
          ),
        ),
      );
      renderTaskApp();
      await screen.findByText("Failed to load tasks. Please refresh the page.");
    });
  });

  // ── Create task ─────────────────────────────────────────────────────────────

  describe("create task", () => {
    it("Add Task button is disabled when input is empty", () => {
      renderTaskApp();
      expect(screen.getByRole("button", { name: /add task/i })).toBeDisabled();
    });

    it("clears input and restores focus on successful create", async () => {
      // Delay POST response to verify optimistic item appears before server responds
      server.use(
        http.post("http://localhost:3000/tasks", async () => {
          await delay(100);
          return HttpResponse.json(
            {
              data: {
                id: 99,
                title: "Walk the dog",
                isCompleted: false,
                createdAt: new Date().toISOString(),
              },
            },
            { status: 201 },
          );
        }),
      );
      const user = userEvent.setup();
      renderTaskApp();
      await screen.findByText("Buy groceries");

      const input = screen.getByTestId("task-input");
      await user.type(input, "Walk the dog");
      await user.click(screen.getByRole("button", { name: /add task/i }));

      // Optimistic item appears immediately before server responds
      expect(screen.getByText("Walk the dog")).toBeInTheDocument();

      // onMutate clears input immediately
      await waitFor(() => {
        expect(input).toHaveValue("");
      });

      // After mutation settles, useEffect restores focus to input
      await waitFor(() => {
        expect(document.activeElement).toBe(input);
      });

      // No error toast shown
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows toast and restores draft title when POST /tasks fails", async () => {
      server.use(
        http.post("http://localhost:3000/tasks", () =>
          HttpResponse.json(
            { error: { code: "SERVER_ERROR", message: "Server error" } },
            { status: 500 },
          ),
        ),
      );
      const user = userEvent.setup();
      renderTaskApp();
      await screen.findByText("Buy groceries");

      const input = screen.getByTestId("task-input");
      await user.type(input, "New task draft");
      await user.click(screen.getByRole("button", { name: /add task/i }));

      // Toast appears
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Failed to add task",
        );
      });
      // Draft title is restored in input
      await waitFor(() => {
        expect(input).toHaveValue("New task draft");
      });
    });
  });

  // ── Edit task ───────────────────────────────────────────────────────────────

  describe("edit task", () => {
    it("updates task title on successful edit", async () => {
      // Override GET: first call returns original task; subsequent calls return updated task
      let fetchCount = 0;
      server.use(
        http.get("http://localhost:3000/tasks", () => {
          fetchCount++;
          return HttpResponse.json({
            data:
              fetchCount === 1
                ? [mockTask]
                : [{ ...mockTask, title: "Buy milk" }],
          });
        }),
      );

      const user = userEvent.setup();
      renderTaskApp();
      await screen.findByText("Buy groceries");

      await user.click(screen.getByRole("button", { name: /edit/i }));

      const editInput = screen.getByDisplayValue("Buy groceries");
      await user.clear(editInput);
      await user.type(editInput, "Buy milk");
      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText("Buy milk")).toBeInTheDocument();
      });
    });

    it("cancels edit without changing the title", async () => {
      const user = userEvent.setup();
      renderTaskApp();
      await screen.findByText("Buy groceries");

      await user.click(screen.getByRole("button", { name: /edit/i }));
      const editInput = screen.getByDisplayValue("Buy groceries");
      await user.clear(editInput);
      await user.type(editInput, "Partially changed");
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      // Edit form gone, original title preserved
      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /save/i }),
        ).not.toBeInTheDocument();
        expect(screen.getByText("Buy groceries")).toBeInTheDocument();
      });
    });

    it("shows toast and re-opens edit form when PATCH fails", async () => {
      server.use(
        http.patch("http://localhost:3000/tasks/:id", () =>
          HttpResponse.json(
            { error: { code: "SERVER_ERROR", message: "Server error" } },
            { status: 500 },
          ),
        ),
      );
      const user = userEvent.setup();
      renderTaskApp();
      await screen.findByText("Buy groceries");

      await user.click(screen.getByRole("button", { name: /edit/i }));
      const editInput = screen.getByDisplayValue("Buy groceries");
      await user.clear(editInput);
      await user.type(editInput, "Something new");
      await user.click(screen.getByRole("button", { name: /save/i }));

      // Toast appears
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Failed to update task",
        );
      });
      // Edit form re-opens with original title
      await waitFor(() => {
        expect(screen.getByDisplayValue("Buy groceries")).toBeInTheDocument();
      });
    });
  });

  // ── Complete task ───────────────────────────────────────────────────────────

  describe("complete task", () => {
    it("checks checkbox and applies line-through styling on success", async () => {
      // Override GET: return isCompleted: true after the PATCH settles
      let fetchCount = 0;
      server.use(
        http.get("http://localhost:3000/tasks", () => {
          fetchCount++;
          return HttpResponse.json({
            data:
              fetchCount === 1
                ? [mockTask]
                : [{ ...mockTask, isCompleted: true }],
          });
        }),
      );
      const user = userEvent.setup();
      renderTaskApp();
      await screen.findByText("Buy groceries");

      const checkbox = screen.getByRole("checkbox", {
        name: /mark "buy groceries" as complete/i,
      });
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);

      await waitFor(() => {
        expect(checkbox).toBeChecked();
      });
      const titleSpan = screen.getByText("Buy groceries");
      expect(titleSpan).toHaveClass("line-through");

      // No error toast shown
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows toast and reverts checkbox when PATCH complete fails", async () => {
      server.use(
        http.patch("http://localhost:3000/tasks/:id", () =>
          HttpResponse.json(
            { error: { code: "SERVER_ERROR", message: "Failed to update" } },
            { status: 500 },
          ),
        ),
      );
      const user = userEvent.setup();
      renderTaskApp();
      await screen.findByText("Buy groceries");

      const checkbox = screen.getByRole("checkbox", {
        name: /mark "buy groceries" as complete/i,
      });
      await user.click(checkbox);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Failed to update task status",
        );
      });
      // Checkbox reverted
      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });
  });

  // ── Delete task ─────────────────────────────────────────────────────────────

  describe("delete task", () => {
    it("removes task from list on successful delete", async () => {
      // Override GET: first call returns mockTask; re-fetch after DELETE returns empty
      let fetchCount = 0;
      server.use(
        http.get("http://localhost:3000/tasks", () => {
          fetchCount++;
          return HttpResponse.json({
            data: fetchCount === 1 ? [mockTask] : [],
          });
        }),
      );

      const user = userEvent.setup();
      renderTaskApp();
      await screen.findByText("Buy groceries");

      await user.click(
        screen.getByRole("button", { name: /delete "buy groceries"/i }),
      );

      await waitFor(() => {
        expect(screen.queryByText("Buy groceries")).not.toBeInTheDocument();
      });
    });

    it("shows toast and restores task when DELETE fails", async () => {
      server.use(
        http.delete("http://localhost:3000/tasks/:id", () =>
          HttpResponse.json(
            { error: { code: "DB_ERROR", message: "Failed to delete task" } },
            { status: 500 },
          ),
        ),
      );
      const user = userEvent.setup();
      renderTaskApp();
      await screen.findByText("Buy groceries");

      await user.click(
        screen.getByRole("button", { name: /delete "buy groceries"/i }),
      );

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Failed to delete task",
        );
      });
      // Task restored (rollback is async — must be inside waitFor)
      await waitFor(() => {
        expect(screen.getByText("Buy groceries")).toBeInTheDocument();
      });
    });
  });

  // ── Completed task display ──────────────────────────────────────────────────

  describe("completed task display", () => {
    it("shows line-through on completed task title", async () => {
      server.use(
        http.get("http://localhost:3000/tasks", () =>
          HttpResponse.json({
            data: [{ ...mockTask, isCompleted: true }],
          }),
        ),
      );
      renderTaskApp();
      const span = await screen.findByText("Buy groceries");
      expect(span).toHaveClass("line-through");
    });
  });
});
