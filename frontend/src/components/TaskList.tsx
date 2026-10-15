import type { Task } from "../types";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newTitle: string) => void;
}

export function TaskList({ tasks, loading, onToggle, onDelete, onUpdate }: TaskListProps) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
      {loading ? (
        <p className="text-center py-8 text-slate-400 text-sm">Cargando tareas...</p>
      ) : tasks.length === 0 ? (
        <p className="text-center py-8 text-slate-400 text-sm">No hay tareas con este filtro. 🚀</p>
      ) : (
        <ul className="divide-y divide-slate-700/60">
          {tasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onToggle={onToggle} 
              onDelete={onDelete} 
              onUpdate={onUpdate} 
            />
          ))}
        </ul>
      )}
    </div>
  );
}