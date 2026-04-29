import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Toaster, type ToastItem } from "./components/ui/Toaster";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent background refetches from overwriting optimistic state between
      // onMutate and onSettled. All mutations call invalidateQueries in onSettled,
      // so the cache is always synced with the server after each action.
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  },
});

const API_BASE = "http://localhost:3000";

interface Task {
  id: number;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  isPending?: boolean;
}

function TaskApp() {
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const nextToastIdRef = useRef(0);
  const qc = useQueryClient();

  const showToast = (message: string) => {
    nextToastIdRef.current += 1;
    const id = nextToastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const { data: tasks = [], isError: isTasksError } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async ({ signal }) => {
      const res = await fetch(`${API_BASE}/tasks`, { signal });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return json.data as Task[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onMutate: async (newTitle: string) => {
      void qc.cancelQueries({ queryKey: ["tasks"] });
      const optimisticId = -Date.now();
      const optimisticTask: Task = {
        id: optimisticId,
        title: newTitle,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        isPending: true,
      };
      qc.setQueryData<Task[]>(["tasks"], (old = []) => [
        ...old,
        optimisticTask,
      ]);
      setTitle("");
      return { optimisticId, draftTitle: newTitle };
    },
    onSuccess: (data, _newTitle, context) => {
      qc.setQueryData<Task[]>(["tasks"], (old = []) =>
        old.map((task) =>
          task.id === context?.optimisticId ? data.data : task,
        ),
      );
    },
    onError: (_err, _newTitle, context) => {
      qc.setQueryData<Task[]>(["tasks"], (old = []) =>
        old.filter((task) => task.id !== context?.optimisticId),
      );
      setTitle(context?.draftTitle ?? "");
      showToast("Failed to add task. Please try again.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onMutate: async ({ id, title }: { id: number; title: string }) => {
      void qc.cancelQueries({ queryKey: ["tasks"] });
      const previousTask = qc
        .getQueryData<Task[]>(["tasks"])
        ?.find((task) => task.id === id);
      qc.setQueryData<Task[]>(["tasks"], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, title } : t)),
      );
      setEditingId(null);
      setEditTitle("");
      return { previousTask };
    },
    onSuccess: (data) => {
      qc.setQueryData<Task[]>(["tasks"], (old = []) =>
        old.map((task) => (task.id === data.data.id ? data.data : task)),
      );
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTask) {
        qc.setQueryData<Task[]>(["tasks"], (old = []) =>
          old.map((task) =>
            task.id === context.previousTask?.id ? context.previousTask : task,
          ),
        );
        setEditingId(context.previousTask.id);
        setEditTitle(context.previousTask.title);
      }
      showToast("Failed to update task. Please try again.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({
      id,
      completed,
    }: {
      id: number;
      completed: boolean;
    }) => {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(errPayload.error?.message || "Failed to update task");
      }
      return res.json();
    },
    onMutate: async ({ id, completed }: { id: number; completed: boolean }) => {
      void qc.cancelQueries({ queryKey: ["tasks"] });
      const previousTask = qc
        .getQueryData<Task[]>(["tasks"])
        ?.find((task) => task.id === id);
      qc.setQueryData<Task[]>(["tasks"], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, isCompleted: completed } : t)),
      );
      return { previousTask };
    },
    onSuccess: (data) => {
      qc.setQueryData<Task[]>(["tasks"], (old = []) =>
        old.map((task) => (task.id === data.data.id ? data.data : task)),
      );
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTask) {
        qc.setQueryData<Task[]>(["tasks"], (old = []) =>
          old.map((task) =>
            task.id === context.previousTask?.id ? context.previousTask : task,
          ),
        );
      }
      showToast("Failed to update task status. Please try again.");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(errPayload.error?.message || "Failed to delete task");
      }
      return id;
    },
    onMutate: async (id: number) => {
      void qc.cancelQueries({ queryKey: ["tasks"] });
      const currentTasks = qc.getQueryData<Task[]>(["tasks"]) ?? [];
      const deletedTask = currentTasks.find((task) => task.id === id);
      const deletedTaskIndex = currentTasks.findIndex((task) => task.id === id);
      qc.setQueryData<Task[]>(["tasks"], (old = []) =>
        old ? old.filter((t) => t.id !== id) : [],
      );
      return { deletedTask, deletedTaskIndex };
    },
    onError: (_err, _id, context) => {
      if (context?.deletedTask && context.deletedTaskIndex !== undefined) {
        qc.setQueryData<Task[]>(["tasks"], (old = []) => {
          const restoredTasks = [...old];
          restoredTasks.splice(
            context.deletedTaskIndex,
            0,
            context.deletedTask,
          );
          return restoredTasks;
        });
      }
      showToast(
        _err instanceof Error
          ? _err.message
          : "Failed to delete task. Please try again.",
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
  // Focus the input after a task is successfully created.
  // useEffect is used instead of setTimeout in onSuccess because React 18 may defer
  // the commit that removes disabled={isPending} until after setTimeout(0) fires.
  // useEffect always runs after the DOM is committed, so the input is guaranteed
  // to be enabled when focus() is called.
  useEffect(() => {
    if (createMutation.isSuccess && !createMutation.isPending) {
      taskInputRef.current?.focus();
    }
  }, [createMutation.isPending, createMutation.isSuccess]);

  const startEdit = (task: Task) => {
    // Prevent opening another edit while saving
    if (editMutation.isPending) return;

    setEditingId(task.id);
    setEditTitle(task.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    // ID 12: Stale error state persists after cancel
    editMutation.reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createMutation.mutate(title);
    }
  };

  const handleEditSubmit = (e: React.FormEvent, taskId: number) => {
    e.preventDefault();
    // ID 4: Prevent concurrent edit submissions
    if (editMutation.isPending) return;
    if (editTitle.trim()) {
      editMutation.mutate({ id: taskId, title: editTitle.trim() });
    }
  };

  return (
    <>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md dark:bg-zinc-800">
        <h1 className="text-2xl font-bold mb-6 text-zinc-800 dark:text-white">
          bmad-todo Tasks
        </h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <label htmlFor="newTask" className="sr-only">
            New task
          </label>
          <div className="flex flex-col gap-2">
            <input
              id="newTask"
              ref={taskInputRef}
              data-testid="task-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-2 border border-zinc-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
              disabled={createMutation.isPending}
            />
            <button
              type="submit"
              disabled={!title.trim() || createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Task
            </button>
          </div>
        </form>

        {isTasksError && (
          <p
            role="alert"
            className="mb-4 text-sm text-red-600 dark:text-red-400"
          >
            Failed to load tasks. Please refresh the page.
          </p>
        )}

        <ul
          className="space-y-3"
          data-testid="task-list"
          aria-label="Task list"
        >
          {tasks.length === 0 && (
            <p className="text-zinc-500 italic">No tasks yet.</p>
          )}
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded border ${
                task.isPending
                  ? "bg-zinc-100 border-zinc-300 opacity-70 dark:bg-zinc-800 dark:border-zinc-500"
                  : "bg-zinc-50 border-zinc-200 dark:bg-zinc-700 dark:border-zinc-600"
              }`}
            >
              {editingId === task.id ? (
                <form
                  onSubmit={(e) => handleEditSubmit(e, task.id)}
                  className="flex flex-1 gap-2"
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    className="flex-1 px-2 py-1 border border-zinc-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-zinc-600 dark:border-zinc-500 dark:text-white"
                    disabled={editMutation.isPending}
                  />
                  <button
                    type="submit"
                    disabled={!editTitle.trim() || editMutation.isPending}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={editMutation.isPending}
                    className="px-3 py-1 bg-zinc-200 text-zinc-700 text-sm rounded hover:bg-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-600 dark:text-zinc-200"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() =>
                        completeMutation.mutate({
                          id: task.id,
                          completed: !task.isCompleted,
                        })
                      }
                      disabled={completeMutation.isPending || task.isPending}
                      aria-label={`Mark "${task.title}" as ${
                        task.isCompleted ? "incomplete" : "complete"
                      }`}
                      className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-sm"
                    />
                    <span
                      className={
                        task.isCompleted
                          ? "line-through text-zinc-400"
                          : "text-zinc-800 dark:text-white"
                      }
                    >
                      {task.title}
                    </span>
                  </label>
                  <span className="ml-auto text-xs text-zinc-400">
                    {task.isPending
                      ? "Saving..."
                      : new Date(task.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => startEdit(task)}
                    disabled={task.isPending || editMutation.isPending}
                    className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(task.id)}
                    disabled={
                      task.isPending ||
                      deleteMutation.isPending ||
                      editMutation.isPending ||
                      completeMutation.isPending
                    }
                    className="px-2 py-1 text-xs text-red-600 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                    aria-label={`Delete "${task.title}"`}
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      <Toaster toasts={toasts} />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 py-10 w-full text-left font-sans">
        <TaskApp />
      </div>
    </QueryClientProvider>
  );
}
