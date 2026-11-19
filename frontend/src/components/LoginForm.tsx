import { useState } from "react";
import { isAxiosError } from "axios";
import { LoaderCircle, LogIn, Sparkles, UserPlus } from "lucide-react";
import { api } from "../services/api.js";

interface LoginFormProps {
  onLoginSuccess: (token: string) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<"login" | "demo" | null>(null);

  const getErrorMessage = (error: unknown) => {
    if (!isAxiosError<{ message?: unknown; error?: unknown }>(error)) {
      return "An unexpected error occurred";
    }
    if (!error.response) {
      return "Could not connect to the server. Check that the backend is available.";
    }
    const responseData = error.response.data;
    return typeof responseData?.message === "string"
      ? responseData.message
      : typeof responseData?.error === "string"
        ? responseData.error
        : "An unexpected error occurred";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingAction) return;
    setMessage(null);
    setPendingAction("login");
    const endpoint = isRegistering ? "/auth/register" : "/auth/login";

    try {
      const response = await api.post(endpoint, { email, password });
      if (isRegistering) {
        setMessage({ type: "success", text: "Account created successfully! You can now sign in." });
        setIsRegistering(false);
        setPassword("");
      } else {
        onLoginSuccess(response.data.token);
      }
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleDemoLogin = async () => {
    if (pendingAction) return;
    setMessage(null);
    setPendingAction("demo");

    try {
      const response = await api.post<{ token?: unknown }>("/auth/demo");
      if (typeof response.data.token !== "string") {
        throw new Error("The server returned an invalid demo session.");
      }
      onLoginSuccess(response.data.token);
    } catch (error: unknown) {
      setMessage({
        type: "error",
        text: error instanceof Error && !isAxiosError(error)
          ? error.message
          : getErrorMessage(error),
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 text-slate-100">
      <div className="bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-xs border border-slate-700">
        <h1 className="text-lg font-bold mb-1 text-center text-indigo-400">
          {isRegistering ? "Create Account" : "TaskApp Login"}
        </h1>
        <p className="text-xs text-center text-slate-400 mb-5">
          {isRegistering ? "Sign up to manage your tasks" : "Sign in to access your tasks"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="email" className="block text-[11px] font-medium uppercase tracking-wider mb-1 text-slate-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-100"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[11px] font-medium uppercase tracking-wider mb-1 text-slate-400">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={pendingAction !== null}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm font-semibold rounded-md shadow-md cursor-pointer mt-1 disabled:cursor-wait disabled:opacity-60"
          >
            {pendingAction === "login" ? (
              <>
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                {isRegistering ? "Creating account..." : "Signing in..."}
              </>
            ) : isRegistering ? (
              <>
                <UserPlus size={16} /> Sign up
              </>
            ) : (
              <>
                <LogIn size={16} /> Sign in
              </>
            )}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-slate-700/80" />
          <span className="text-[11px] text-slate-500">or</span>
          <span className="h-px flex-1 bg-slate-700/80" />
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={pendingAction !== null}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-indigo-400/30 bg-indigo-400/10 py-2 text-sm font-semibold text-indigo-200 transition-colors hover:border-indigo-300/50 hover:bg-indigo-400/15 disabled:cursor-wait disabled:opacity-60"
        >
          {pendingAction === "demo" ? (
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles size={16} aria-hidden="true" />
          )}
          {pendingAction === "demo" ? "Abriendo demo..." : "Entrar como invitado / Demo"}
        </button>

        {message && (
          <p
            role="alert"
            className={`mt-4 text-center text-xs font-medium p-2 rounded-md border ${
              message.type === "success"
                ? "text-emerald-400 bg-emerald-950/30 border-emerald-800/50"
                : "text-rose-400 bg-rose-950/30 border-rose-800/50"
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="mt-5 pt-4 border-t border-slate-700/60 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setMessage(null);
            }}
            disabled={pendingAction !== null}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer transition-colors disabled:opacity-60"
          >
            {isRegistering ? "Already have an account? Sign in" : "Don't have an account? Sign up for free"}
          </button>
        </div>
      </div>
    </div>
  );
}