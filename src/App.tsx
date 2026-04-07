import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Users,
  BarChart3,
  QrCode,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import ConnectionView from "./Connectionview";
import SendView from "./Sendview";

import CampaignsView from "./Campaignsview";
import MasivoSection from "./Bulkview";
import LoginView from "./LoginView";

const BASE_URL = "https://do.velsat.pe:8443/whatsapp";

interface AppUser {
  id: string;
  nombre: string;
  api_key: string;
}

type View = "connection" | "send" | "bulk" | "campaigns";
type EstadoWA = "desconectado" | "conectando" | "qr" | "conectado" | "reconectando" | "error";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

// Badge de estado para el header
const StatusBadge = ({ connected }: { connected: boolean }) => (
  <div className="flex items-center gap-2">
    <div className="relative flex h-3 w-3">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connected ? "bg-green-400" : "bg-red-400"} opacity-75`}
      />
      <span
        className={`relative inline-flex rounded-full h-3 w-3 ${connected ? "bg-green-500" : "bg-red-500"}`}
      />
    </div>
    <span
      className={`text-xs font-medium uppercase tracking-wider ${connected ? "text-green-500" : "text-red-500"}`}
    >
      {connected ? "Conectado" : "Desconectado"}
    </span>
  </div>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem("wa_user_session");
    return saved ? JSON.parse(saved) : null;
  });

  const handleSetUser = (user: AppUser | null) => {
    if (user) {
      localStorage.setItem("wa_user_session", JSON.stringify(user));
    } else {
      localStorage.removeItem("wa_user_session");
    }
    setCurrentUser(user);
  };

  const [currentView, setCurrentView] = useState<View>("connection");
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [number, setNumber] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const addToast = (message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3000,
    );
  };

  // ── Callback que recibe el estado de WhatsApp desde ConnectionView ────────
  const handleStatusChange = (
    estado: EstadoWA,
    usuario: string | null,
    numero: string | null,
  ) => {
    setConnected(estado === "conectado");
    setUser(usuario);
    setNumber(numero);
  };

  // ── Socket — solo se conecta aquí, se pasa a los hijos ───────────────────
  useEffect(() => {
    socketRef.current = io(BASE_URL);
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const navItems = [
    { id: "connection", label: "Conexión",  icon: QrCode    },
    { id: "send",       label: "Enviar",    icon: Send      },
    { id: "bulk",       label: "Masivo",    icon: Users     },
    { id: "campaigns",  label: "Campañas",  icon: BarChart3 },
  ];

  if (!currentUser) {
    return <LoginView onSelectUser={handleSetUser} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex font-sans selection:bg-[#25D366] selection:text-black">
      {/* Sidebar */}
      <aside
        className={`bg-[#111111] border-r border-white/5 flex flex-col transition-all duration-300 z-50 ${isSidebarCollapsed ? "w-20" : "w-72"}`}
      >
        <div className="p-6 flex items-center gap-4">
          <div className="bg-[#25D366] p-2 rounded-xl shadow-[0_0_20px_rgba(37,211,102,0.3)]">
            <MessageSquare className="w-6 h-6 text-black" />
          </div>
          {!isSidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-black tracking-tighter"
            >
              WA <span className="text-[#25D366]">BULK</span>
            </motion.span>
          )}
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all relative
                ${currentView === item.id ? "bg-[#25D366] text-black font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
            >
              <item.icon className="w-5 h-5" />
              {!isSidebarCollapsed && <span>{item.label}</span>}
              {currentView === item.id && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute left-0 w-1 h-6 bg-black rounded-r-full"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-4">
          <div
            className={`bg-black/40 rounded-2xl p-4 flex items-center gap-3 ${isSidebarCollapsed ? "justify-center" : ""}`}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-500" />
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#111111] ${connected ? "bg-green-500" : "bg-red-500"}`}
              />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser.nombre}
                </p>
<p className="text-[10px] text-gray-500 truncate">
  WA: {user ? user : number ? "" : "Desconectado"}{number ? ` (${number})` : ""}
</p>
              </div>
            )}
          </div>
          <button
            onClick={() => handleSetUser(null)}
            className={`w-full py-2.5 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-semibold transition-colors border border-red-500/20`}
          >
            <LogOut className="w-4 h-4" />
            {!isSidebarCollapsed && <span>Cerrar sesión</span>}
          </button>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full pt-1 flex items-center justify-center text-gray-600 hover:text-gray-400 transition-colors"
          >
            <ChevronRight
              className={`w-5 h-5 transition-transform ${isSidebarCollapsed ? "" : "rotate-180"}`}
            />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0a0a]/80 backdrop-blur-xl z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold capitalize">{currentView}</h2>
            <div className="h-4 w-px bg-white/10" />
            <StatusBadge connected={connected} />
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right">
               <p className="text-sm font-bold text-white leading-none">{currentUser.nombre}</p>
               <p className="text-[10px] text-gray-400 mt-1">Sesión Activa</p>
             </div>
             <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-black font-bold text-sm shadow-[0_0_15px_rgba(37,211,102,0.2)] border border-white/10">
               {currentUser.nombre.charAt(0).toUpperCase()}
             </div>
          </div>
        </header>

        {!connected && (
          <div className="bg-red-500/10 border-b border-red-500/20 py-2 px-8 flex items-center justify-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">
              WhatsApp no conectado. Algunas funciones están limitadas.
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {currentView === "connection" && (
            <ConnectionView
              apiUrl={`${BASE_URL}/api`}
              apiKey={currentUser.api_key}
              userName={currentUser.nombre}
              socket={socketRef.current}
              onStatusChange={handleStatusChange}
            />
          )}
          {currentView === "send" && (
            <SendView
              connected={connected}
              baseUrl={BASE_URL}
              apiKey={currentUser.api_key}
              onToast={addToast}
            />
          )}
          {currentView === "bulk" && (
            <MasivoSection
              isConnected={connected}
              socket={socketRef.current}
              apiKey={currentUser.api_key}
              onToast={addToast}
            />
          )}
          {currentView === "campaigns" && (
            <CampaignsView
              baseUrl={BASE_URL}
              apiKey={currentUser.api_key}
              onToast={addToast}
            />
          )}
        </div>

        {/* Toasts */}
        <div className="fixed bottom-8 right-8 z-100 flex flex-col gap-3">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border backdrop-blur-xl
                  ${
                    toast.type === "success"
                      ? "bg-green-500/10 border-green-500/20 text-green-500"
                      : toast.type === "error"
                        ? "bg-red-500/10 border-red-500/20 text-red-500"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                  }`}
              >
                {toast.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : toast.type === "error" ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="text-sm font-bold">{toast.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}