import { useState, useEffect, useCallback } from "react";
import { api } from "./services/api.js";
import { isAxiosError } from "axios";
import { Bot, LogOut, MessageCircle, ListTodo } from "lucide-react";
import { LoginForm } from "./components/LoginForm.js";
import { TaskForm } from "./components/TaskForm.js";
import { TaskList } from "./components/TaskList.js";
import { Chat } from "./components/Chat.js";
import { AgentChatBox } from "./components/AgentChatBox.js";
import type { Task } from "./types.js";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [activeView, setActiveView] = useState<"tasks" | "chat" | "agent">("tasks");

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setTasks([]);
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const response = await api.get("/tasks");
      setTasks(response.data);
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        handleLogout();
      } else {
        console.error("Failed to load tasks", error);
      }
    } finally {
      setLoadingTasks(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    if (token) {
      void Promise.resolve().then(fetchTasks);
    }
  }, [token, fetchTasks]);

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const handleCreateTask = async (title: string) => {
    try {
      const response = await api.post("/tasks", { title });
      setTasks((currentTasks) => [...currentTasks, response.data]);
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    try {
      const response = await api.patch(`/tasks/${id}`, { completed: !completed });
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === id ? response.data : task)));
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  const handleUpdateTask = async (id: string, newTitle: string) => {
    try {
      const response = await api.patch(`/tasks/${id}`, { title: newTitle });
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === id ? response.data : task)));
    } catch (err) {
      console.error("Failed to update task title", err);
    }
  };
  
  const handleDeleteTask = async (id: string) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  // Filter tasks by the selected status.
  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") return !task.completed;
    if (filter === "completed") return task.completed;
    return true; // "all"
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      {!token ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
      <main className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
          <h1 className="text-lg font-bold text-indigo-400">TaskApp Dashboard</h1>
          <nav aria-label="Sections" className="flex items-center gap-2">
            <button
              onClick={() => setActiveView("tasks")}
              aria-current={activeView === "tasks" ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                activeView === "tasks" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              <ListTodo size={15} /> Tasks
            </button>
            <button
              onClick={() => setActiveView("chat")}
              aria-current={activeView === "chat" ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                activeView === "chat" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              <MessageCircle size={15} /> Chat
            </button>
            <button
              onClick={() => setActiveView("agent")}
              aria-current={activeView === "agent" ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                activeView === "agent" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Bot size={15} /> Agent
            </button>
          </nav>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>

        {activeView === "agent" ? (
          <AgentChatBox token={token} onUnauthorized={handleLogout} />
        ) : activeView === "chat" ? (
          <Chat token={token} onUnauthorized={handleLogout} />
        ) : (
          <div className="max-w-xl mx-auto">
            <TaskForm onAddTask={handleCreateTask} />

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filter === "all"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-750 border border-slate-700"
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filter === "pending"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-750 border border-slate-700"
                }`}
              >
                Pending ({tasks.filter((task) => !task.completed).length})
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filter === "completed"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-750 border border-slate-700"
                }`}
              >
                Completed ({tasks.filter((task) => task.completed).length})
              </button>
            </div>

            <TaskList
              tasks={filteredTasks}
              loading={loadingTasks}
              onToggle={handleToggleTask}
              onDelete={handleDeleteTask}
              onUpdate={handleUpdateTask}
            />
          </div>
        )}
      </div>
      </main>
      )}
      <footer className="shrink-0 px-4 py-4 text-center text-xs text-slate-400">
        Built by Arnau Jimenez ·{" "}
        <a
          href="https://github.com/ArnauJimenez"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}