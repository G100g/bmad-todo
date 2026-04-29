import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

const queryClient = new QueryClient();

const API_BASE = "http://localhost:3000";

interface Task {
  id: number;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

function TaskApp() {
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const qc = useQueryClient();

  const { data: tasks = [], isError: isTasksError } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/tasks`);
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
    onSuccess: (data) => {
      // Optimistic update or refetch
      qc.setQueryData(["tasks"], (old: Task[] = []) => [...old, data.data]);
      setTitle("");
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
    onSuccess: (data) => {
      // ID 9: Response structure validation missing
      if (!data?.data?.id) {
        throw new Error("Invalid response structure from server");
      }
      qc.setQueryData(["tasks"], (old: Task[] = []) =>
        old.map((t) => (t.id === data.data.id ? data.data : t)),
      );
      setEditingId(null);
      setEditTitle("");
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
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: (data) => {
      qc.setQueryData(["tasks"], (old: Task[] = []) =>
        old.map((t) => (t.id === data.data.id ? data.data : t)),
      );
    },
  });

  const startEdit = (task: Task) => {
    // ID 4: Prevent opening another edit while saving
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
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 px-4 py-2 border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
            disabled={createMutation.isPending}
          />
          <button
            type="submit"
            disabled={!title.trim() || createMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Task
          </button>
        </div>
      </form>

      {createMutation.isError && (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
          Failed to add task. Please try again.
        </p>
      )}

      {editMutation.isError && (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
          Failed to update task. Please try again.
        </p>
      )}

      {completeMutation.isError && (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
          Failed to update task status. Please try again.
        </p>
      )}

      {isTasksError && (
        <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
          Failed to load tasks. Please refresh the page.
        </p>
      )}

      <ul className="space-y-3">
        {tasks.length === 0 && (
          <p className="text-zinc-500 italic">No tasks yet.</p>
        )}
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center gap-3 p-3 bg-zinc-50 rounded border border-zinc-200 dark:bg-zinc-700 dark:border-zinc-600"
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
                  className="flex-1 px-2 py-1 border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-600 dark:border-zinc-500 dark:text-white"
                  disabled={editMutation.isPending}
                />
                <button
                  type="submit"
                  disabled={!editTitle.trim() || editMutation.isPending}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={editMutation.isPending}
                  className="px-3 py-1 bg-zinc-200 text-zinc-700 text-sm rounded hover:bg-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-600 dark:text-zinc-200"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <input
                  type="checkbox"
                  checked={task.isCompleted}
                  onChange={() =>
                    completeMutation.mutate({
                      id: task.id,
                      completed: !task.isCompleted,
                    })
                  }
                  disabled={completeMutation.isPending}
                  aria-label={`Mark "${task.title}" as ${
                    task.isCompleted ? "incomplete" : "complete"
                  }`}
                  className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
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
                <span className="ml-auto text-xs text-zinc-400">
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => startEdit(task)}
                  className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Edit
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
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
