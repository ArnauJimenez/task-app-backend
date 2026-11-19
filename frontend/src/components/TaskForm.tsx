import { useState } from "react";
import { Plus } from "lucide-react";

interface TaskFormProps {
  onAddTask: (title: string) => void;
}

export function TaskForm({ onAddTask }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(true);
      return;
    }
    onAddTask(trimmedTitle);
    setTitle("");
    setError(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          aria-label="Task name"
          aria-invalid={error}
          aria-describedby={error ? "task-title-error" : undefined}
          placeholder="Add a new task..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(false);
          }}
          className="min-w-0 flex-1 px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-100 placeholder-slate-500"
        />
        <button
          type="submit"
          className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-md cursor-pointer"
        >
          <Plus size={16} /> Add
        </button>
      </div>
      {error && (
        <p id="task-title-error" role="alert" className="mt-2 text-sm text-rose-400">
          Please enter a task name
        </p>
      )}
    </form>
  );
}