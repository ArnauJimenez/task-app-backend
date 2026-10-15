import { useState } from "react";
import { UserPlus, LogIn } from "lucide-react";
import { api } from "../services/api";

interface LoginFormProps {
  onLoginSuccess: (token: string) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const endpoint = isRegistering ? "/auth/register" : "/auth/login";

    try {
      const response = await api.post(endpoint, { email, password });
      if (isRegistering) {
        setMessage({ type: "success", text: "¡Cuenta creada con éxito! Ya puedes iniciar sesión." });
        setIsRegistering(false);
        setPassword("");
      } else {
        onLoginSuccess(response.data.token);
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Ocurrió un error inesperado",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100">
      <div className="bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-xs border border-slate-700">
        <h1 className="text-lg font-bold mb-1 text-center text-indigo-400">
          {isRegistering ? "Crear Cuenta" : "TaskApp Login"}
        </h1>
        <p className="text-xs text-center text-slate-400 mb-5">
          {isRegistering ? "Regístrate para gestionar tus tareas" : "Ingresa para acceder a tus tareas"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider mb-1 text-slate-400">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider mb-1 text-slate-400">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-100"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm font-semibold rounded-md shadow-md cursor-pointer mt-1"
          >
            {isRegistering ? (
              <>
                <UserPlus size={16} /> Registrarme
              </>
            ) : (
              <>
                <LogIn size={16} /> Entrar
              </>
            )}
          </button>
        </form>

        {message && (
          <p
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
            className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer transition-colors"
          >
            {isRegistering ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate gratis"}
          </button>
        </div>
      </div>
    </div>
  );
}