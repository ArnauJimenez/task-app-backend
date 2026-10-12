import { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Error al cargar tareas:', err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const body = isRegistering ? { name, email, password } : { email, password };

    try {
      const res = await fetch(`http://localhost:4000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error en la autenticación');
      }

      if (isRegistering) {
        setIsRegistering(false);
        setAuthError('¡Registro exitoso! Ya puedes iniciar sesión.');
      } else {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setPassword('');
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setTasks([]);
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const res = await fetch('http://localhost:4000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });

    if (res.ok) {
      const newTask = await res.json();
      setTasks([newTask, ...tasks]);
      setTitle('');
    }
  };

  const toggleTask = async (id: string, currentCompleted: boolean) => {
    const res = await fetch(`http://localhost:4000/api/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ completed: !currentCompleted }),
    });

    if (res.ok) {
      setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !currentCompleted } : t)));
    }
  };

  const deleteTask = async (id: string) => {
    const res = await fetch(`http://localhost:4000/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setTasks(tasks.filter((t) => t.id !== id));
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 w-full max-w-md p-8 rounded-2xl shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {isRegistering ? 'Crea tu cuenta' : '¡Bienvenido de nuevo!'}
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              {isRegistering ? 'Regístrate para empezar a organizar tus tareas' : 'Inicia sesión para acceder a tu panel'}
            </p>
          </div>

          {authError && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${authError.includes('exitoso') ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-rose-900/50 text-rose-300 border border-rose-700'}`}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Correo Electrónico</label>
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 mt-2 cursor-pointer"
            >
              {isRegistering ? 'Crear cuenta' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-slate-400">
            {isRegistering ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError('');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium ml-1 underline cursor-pointer"
            >
              {isRegistering ? 'Inicia sesión' : 'Regístrate'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Mis Tareas</h1>
            <p className="text-xs text-slate-400 mt-0.5">Organiza tu día de forma eficiente</p>
          </div>
          <button
            onClick={logout}
            className="w-full sm:w-auto bg-slate-700 hover:bg-rose-600/80 text-slate-200 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-center"
          >
            Cerrar Sesión
          </button>
        </header>

        <form onSubmit={createTask} className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="¿Qué necesitas hacer hoy?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center"
          >
            Añadir
          </button>
        </form>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
          {tasks.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <p className="text-base font-medium">No tienes tareas pendientes</p>
              <p className="text-xs mt-1">¡Crea una arriba para empezar!</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/60">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors group"
                >
                  <div className="flex items-center gap-3 cursor-pointer flex-1 mr-4" onClick={() => toggleTask(task.id, task.completed)}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => {}}
                      className="w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900 cursor-pointer"
                    />
                    <span
                      className={`text-sm transition-all ${
                        task.completed ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                  >
                    Borrar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;