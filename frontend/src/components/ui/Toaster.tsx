export interface ToastItem {
  id: number;
  message: string;
}

interface ToasterProps {
  toasts: ToastItem[];
}

export function Toaster({ toasts }: ToasterProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="assertive"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className="px-4 py-3 bg-zinc-900 text-white text-sm rounded shadow-lg dark:bg-zinc-100 dark:text-zinc-900 max-w-sm"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
