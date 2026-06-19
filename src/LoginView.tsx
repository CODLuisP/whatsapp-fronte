import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { AlertCircle, ChevronRight, Zap, Eye, EyeOff, ArrowLeft, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import logoAeroSend from "./assets/logoaeroSend.png";

interface User {
  id: string;
  nombre: string;
  api_key: string;
}

interface LoginViewProps {
  onSelectUser: (user: User) => void;
}

const AVATAR_COLORS = [
  ["#4ade80", "#16a34a"],
  ["#60a5fa", "#2563eb"],
  ["#f472b6", "#db2777"],
  ["#fb923c", "#ea580c"],
  ["#a78bfa", "#7c3aed"],
  ["#34d399", "#059669"],
];

const SECRET = "send20";

export default function LoginView({ onSelectUser }: LoginViewProps) {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [hovered, setHovered]   = useState<string | null>(null);

  // password step
  const [pending, setPending]   = useState<{ user: User; colorIdx: number } | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [pwError, setPwError]   = useState(false);
  const [shaking, setShaking]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users`)
      .then(({ data }) => {
        if (data.exito) setUsers(data.datos);
        else setError(data.error || "Error al cargar usuarios");
      })
      .catch((err) => setError(err.response?.data?.error || "Error de conexión con la API"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectUser = (user: User, idx: number) => {
    setPending({ user, colorIdx: idx });
    setPassword("");
    setPwError(false);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleBack = () => {
    setPending(null);
    setPassword("");
    setPwError(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === SECRET) {
      onSelectUser(pending!.user);
    } else {
      setPwError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setPassword("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const [from] = pending ? AVATAR_COLORS[pending.colorIdx % AVATAR_COLORS.length] : ["#4ade80"];

  return (
    <div className="min-h-screen bg-[#060906] flex items-center justify-center p-4 overflow-hidden relative">

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo + brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-[#4ade80]/20 rounded-2xl blur-xl scale-110" />
            <div className="relative bg-[#0f1a0f] border border-[#4ade80]/20 rounded-2xl p-3">
              <img src={logoAeroSend} alt="AeroSend" className="w-12 h-12 object-contain" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">AeroSend</h1>
          <p className="text-gray-400 text-xs mt-1 tracking-widest uppercase font-medium">WhatsApp Platform</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
          className="bg-[#0c110c]/80 backdrop-blur-xl border border-white/[0.07] rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Top accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#4ade80]/40 to-transparent" />

          <div className="p-5">

            <AnimatePresence mode="wait">

              {/* ── Step 1: user list ── */}
              {!pending ? (
                <motion.div
                  key="users-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="mb-5">
                    <p className="text-gray-200 font-bold text-sm">Selecciona tu cuenta</p>
                    <p className="text-gray-400 text-xs mt-0.5">Elige un usuario para continuar</p>
                  </div>

                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center py-8 gap-3">
                        <div className="relative w-8 h-8">
                          <div className="absolute inset-0 rounded-full border-2 border-[#4ade80]/20" />
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#4ade80] animate-spin" />
                        </div>
                        <p className="text-white/30 text-xs">Cargando usuarios...</p>
                      </motion.div>
                    ) : error ? (
                      <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/[0.07] border border-red-500/20 rounded-xl p-3.5 flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-red-400 text-xs font-bold">Error de conexión</p>
                          <p className="text-red-400/60 text-[11px] mt-0.5">{error}</p>
                        </div>
                      </motion.div>
                    ) : users.length === 0 ? (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-center py-8">
                        <p className="text-white/20 text-sm">No hay usuarios registrados</p>
                      </motion.div>
                    ) : (
                      <motion.div key="list" className="space-y-2">
                        {users.map((user, idx) => {
                          const [c, c2] = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                          const isHovered = hovered === user.id;
                          return (
                            <motion.button
                              key={user.id}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.07, duration: 0.3, ease: "easeOut" }}
                              whileHover={{ scale: 1.015 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSelectUser(user, idx)}
                              onHoverStart={() => setHovered(user.id)}
                              onHoverEnd={() => setHovered(null)}
                              className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-3 flex items-center gap-3 transition-colors text-left relative overflow-hidden"
                            >
                              <motion.div animate={{ opacity: isHovered ? 1 : 0 }} transition={{ duration: 0.2 }}
                                className="absolute inset-0 bg-gradient-to-r from-[#4ade80]/[0.04] to-transparent pointer-events-none" />
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
                                style={{ background: `linear-gradient(135deg, ${c}22, ${c2}33)`, border: `1px solid ${c}30`, color: c }}>
                                {user.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-sm leading-none">{user.nombre}</p>
                                <p className="text-white/25 text-[10px] font-mono mt-1">{user.id.split("-")[0]}...</p>
                              </div>
                              <motion.div animate={{ x: isHovered ? 2 : 0, color: isHovered ? c : "rgba(255,255,255,0.2)" }} transition={{ duration: 0.15 }}>
                                <ChevronRight className="w-4 h-4" />
                              </motion.div>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

              ) : (

              /* ── Step 2: password ── */
                <motion.div
                  key="pw-step"
                  initial={{ opacity: 0, x: 30 }}
                  animate={shaking
                    ? { opacity: 1, x: [0, -8, 8, -6, 6, -4, 4, 0] }
                    : { opacity: 1, x: 0 }
                  }
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: shaking ? 0.45 : 0.22 }}
                >
                  {/* Back + user info */}
                  <div className="flex items-center gap-3 mb-5">
                    <motion.button
                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
                      onClick={handleBack}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </motion.button>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                        style={{ background: `linear-gradient(135deg, ${from}22, ${from}33)`, border: `1px solid ${from}30`, color: from }}>
                        {pending.user.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm leading-none">{pending.user.nombre}</p>
                        <p className="text-white/30 text-[10px] mt-0.5">Ingresa tu contraseña</p>
                      </div>
                    </div>
                  </div>

                  {/* Password form */}
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Lock className="w-3.5 h-3.5 text-white/20" />
                      </div>
                      <input
                        ref={inputRef}
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
                        placeholder="Contraseña"
                        autoComplete="current-password"
                        className={`w-full bg-white/[0.04] border rounded-xl py-2.5 pl-9 pr-10 text-sm text-white outline-none transition-all placeholder:text-white/20
                          ${pwError
                            ? "border-red-500/40 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20"
                            : "border-white/[0.07] focus:border-[#4ade80]/40 focus:ring-1 focus:ring-[#4ade80]/20"}`}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                        {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <AnimatePresence>
                      {pwError && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="text-red-400 text-[11px] flex items-center gap-1.5"
                        >
                          <AlertCircle className="w-3 h-3" /> Contraseña incorrecta
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.97 }}
                      className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                      style={{ background: from, color: "#000" }}
                    >
                      Ingresar
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[#4ade80]/50" />
              <span className="text-gray-400 text-[10px] font-medium">Powered by WhatsApp</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              <span className="text-[10px] text-gray-400">API activa</span>
            </div>
          </div>
        </motion.div>

        {/* Bottom caption */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-gray-400 text-[10px] mt-5 tracking-wide"
        >
          v1.0 · Solo para uso interno
        </motion.p>

      </div>
    </div>
  );
}
