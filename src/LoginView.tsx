import { useState, useEffect } from "react";
import axios from "axios";
import { Users, AlertCircle, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface User {
  id: string;
  nombre: string;
  api_key: string;
}

interface LoginViewProps {
  onSelectUser: (user: User) => void;
}

export default function LoginView({ onSelectUser }: LoginViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get("https://do.velsat.pe:8443/whatsapp/api/users");
        if (data.exito) {
          setUsers(data.datos);
        } else {
          setError(data.error || "Error al cargar usuarios");
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Error de conexión con la API");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 selection:bg-[#25D366] selection:text-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[#111111] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-[#25D366] to-transparent opacity-50" />
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-[#25D366]/10 p-4 rounded-2xl mb-4 border border-[#25D366]/20">
            <Users className="w-10 h-10 text-[#25D366]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Bienvenido</h1>
          <p className="text-gray-400 mt-2 text-sm">Selecciona tu usuario para ingresar</p>
        </div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-500 font-medium">{error}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user, idx) => (
              <motion.button
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => onSelectUser(user)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center">
                    <span className="text-white font-bold">{user.nombre.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold text-base">{user.nombre}</p>
                    <p className="text-xs text-gray-500 font-mono">ID: {user.id.split("-")[0]}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#25D366] group-hover:translate-x-1 transition-all" />
              </motion.button>
            ))}
            {users.length === 0 && !error && (
              <div className="text-center py-6 text-gray-500 text-sm">
                No hay usuarios registrados.
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
