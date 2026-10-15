import { useState } from "react";
import { CheckCircle2, Circle, Trash2, Pencil, Check, X } from "lucide-react";
import type { Task } from "../types";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newTitle: string) => void;
}

export function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const handleSaveEdit = () => {
    if (!editedTitle.trim()) return;
    onUpdate(task.id, editedTitle);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(task.title);
    setIsEditing(false);
  };

  return (
    <li className="flex items-center justify-between p-3.5 hover:bg-slate-700/50 transition-colors gap-2">
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <button
            onClick={handleSaveEdit}
            className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer"
            title="Guardar"
          >
            <Check size={16} />
          </button>
          <button
            onClick={handleCancelEdit}
            className="text-slate-400 hover:text-slate-300 p-1 cursor-pointer"
            title="Cancelar"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div 
            className="flex items-center gap-3 cursor-pointer select-none flex-1" 
            onClick={() => {
              console.log("Clic en tarea:", task.id, "Estado actual completed:", task.completed);
              onToggle(task.id, task.completed);
            }}
          >
            {task.completed ? (
              <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
            ) : (
              <Circle className="text-slate-500 shrink-0" size={18} />
            )}
            <span className={`text-sm ${task.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsEditing(true)}
              className="text-slate-500 hover:text-indigo-400 transition-colors p-1 cursor-pointer"
              title="Editar"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="text-slate-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
              title="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </>
      )}
    </li>
  );
}