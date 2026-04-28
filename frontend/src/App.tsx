import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

const queryClient = new QueryClient();

interface Task {
  id: number;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

function TaskApp() {
  const [title, setTitle] = useState("");
  const qc = useQueryClient();

  // For this story we only need to Create, but we'll setup the list to show creation works
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      // Mock data until read endpoint is done
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const res = await fetch("http://localhost:3000/tasks", {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createMutation.mutate(title);
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

      <ul className="space-y-3">
        {tasks.length === 0 && (
          <p className="text-zinc-500 italic">No tasks yet.</p>
        )}
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center gap-3 p-3 bg-zinc-50 rounded border border-zinc-200 dark:bg-zinc-700 dark:border-zinc-600"
          >
            <span
              className={
                task.isCompleted
                  ? "line-through text-zinc-400"
                  : "text-zinc-800 dark:text-white"
              }
            >
              {task.title}
            </span>
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
