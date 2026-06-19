import { useState, useEffect, useRef } from "react";
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from "react-router-dom";
import {
  Send,
  Users,
  BarChart3,
  QrCode,
  AlertCircle,
  LogOut,
  Code2,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import logoAeroSend from "./assets/logoaeroSend.png";
import userAvatar from "./assets/user.png";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import ConnectionView from "./Connectionview";
import SendView from "./Sendview";
import CampaignsView from "./Campaignsview";
import MasivoSection from "./Bulkview";
import LoginView from "./LoginView";
import ApiView from "./ApiView";
import MensajesView from "./Mensajesview";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppUser {
  id: string;
  nombre: string;
  api_key: string;
}

type EstadoWA = "desconectado" | "conectando" | "qr" | "conectado" | "reconectando" | "error";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: "/conexion",  label: "Conexión", icon: QrCode         },
  { path: "/enviar",    label: "Enviar",   icon: Send           },
  { path: "/masivo",    label: "Masivo",   icon: Users          },
  { path: "/campanas",  label: "Campañas", icon: BarChart3      },
  { path: "/mensajes",  label: "Mensajes", icon: MessageCircle  },
  { path: "/api",       label: "API Docs", icon: Code2          },
];

const ROUTE_LABELS: Record<string, string> = {
  "/conexion": "Conexión",
  "/enviar":   "Enviar",
  "/masivo":   "Masivo",
  "/campanas": "Campañas",
  "/mensajes": "Mensajes",
  "/api":      "API Docs",
};

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? "bg-green-400" : "bg-red-400"}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? "bg-green-500" : "bg-red-500"}`} />
      </div>
      <span className={`text-[10px] font-medium uppercase tracking-wider ${connected ? "text-green-500" : "text-red-500"}`}>
        {connected ? "Conectado" : "Desconectado"}
      </span>
    </div>
  );
}

// ── SidebarContent ────────────────────────────────────────────────────────────

interface SidebarContentProps {
  currentUser: AppUser;
  connected: boolean;
  number: string | null;
  user: string | null;
  onLogout: () => void;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  location: ReturnType<typeof useLocation>;
  showClose?: boolean;
  onClose?: () => void;
}

function SidebarContent({ currentUser, connected, number, user, onLogout, collapsed, onCollapse, location, showClose, onClose }: SidebarContentProps) {
  return (
    <>
      {/* Brand */}
      <div className={`h-14 flex items-center px-4 gap-3 shrink-0 ${collapsed ? "justify-center" : ""}`}>
        <img src={logoAeroSend} alt="AeroSend" className="w-7 h-7 object-contain shrink-0" />
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="brand-text"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="min-w-0 flex-1"
            >
              <p className="text-sm font-black tracking-tight leading-none text-white">
                Aero<span className="text-[#25D366]">Send</span>
              </p>
              <p className="text-[9px] text-white/85 tracking-wide mt-0.5">Suite empresarial</p>
            </motion.div>
          )}
        </AnimatePresence>
        {showClose ? (
          <button onClick={onClose} aria-label="Cerrar menú"
            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : !collapsed ? (
          <button onClick={() => onCollapse(true)} aria-label="Colapsar menú"
            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-white/80 hover:text-white/60 hover:bg-white/[0.06] transition-all">
            <Menu  className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => onCollapse(false)} aria-label="Expandir menú"
            className="absolute inset-x-0 top-0 h-14 opacity-0" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-2 pt-1 pb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/25">
            Navegación
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path || (location.pathname === "/" && item.path === "/conexion");
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`group w-full flex items-center rounded-lg relative transition-all duration-150 text-[13px]
                ${collapsed ? "justify-center h-10" : "gap-3 px-3 h-10"}
                ${active
                  ? "text-white font-medium"
                  : "text-white/45 hover:text-white/80 hover:bg-white/[0.05]"}`}
            >
              {active && (
                <motion.div
                  layoutId="active-nav"
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute inset-0 rounded-lg bg-[#25D366]/[0.12]"
                />
              )}
              <div className={`relative z-10 flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
                <item.icon className={`w-[17px] h-[17px] shrink-0 transition-colors ${active ? "text-[#25D366]" : ""}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] p-2.5 space-y-1 shrink-0">
        {!collapsed && (
          <p className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/25">Cuenta</p>
        )}
        <div className={`flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.05] transition-colors ${collapsed ? "justify-center" : ""}`}>
          <div className="relative shrink-0">
            <div className="w-7 h-7 rounded-full bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] font-bold text-[11px]">
              {currentUser.nombre.charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#030403] ${connected ? "bg-[#25D366]" : "bg-red-500"}`} />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="user-info"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-semibold text-white/80 truncate leading-tight">{currentUser.nombre}</p>
                <p className="text-[10px] text-white/25 truncate leading-tight mt-0.5">
                  {connected ? (number || user || "Conectado") : "Desconectado"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={onLogout}
          title={collapsed ? "Cerrar sesión" : undefined}
          className={`w-full h-8 flex items-center gap-2.5 rounded-lg px-2 text-[11px] font-medium text-white/25 hover:text-red-400 hover:bg-red-500/[0.08] transition-all ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  currentUser: AppUser;
  connected: boolean;
  number: string | null;
  user: string | null;
  onLogout: () => void;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function Sidebar({ currentUser, connected, number, user, onLogout, collapsed, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();

  const sidebarBg = "linear-gradient(180deg, #0d1f10 0%, #08100a 12%, #030503 28%, #020302 50%, #020302 80%, #020302 85%, #030403 88%, #040504 91%, #060807 94%, #08100a 97%, #0b1709 99%, #0d1f10 100%)";

  return (
    <>
      {/* Backdrop móvil */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onMobileClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar desktop (normal flow) */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative hidden md:flex flex-col shrink-0 overflow-hidden z-30 border-r border-white/[0.05] h-screen sticky top-0"
        style={{ background: sidebarBg }}
      >
        <SidebarContent
          currentUser={currentUser} connected={connected} number={number}
          user={user} onLogout={onLogout} collapsed={collapsed} onCollapse={onCollapse}
          location={location}
        />
      </motion.aside>

      {/* Sidebar móvil (drawer overlay) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-0 left-0 h-full w-64 flex flex-col z-50 border-r border-white/[0.05] md:hidden"
            style={{ background: sidebarBg }}
          >
            <SidebarContent
              currentUser={currentUser} connected={connected} number={number}
              user={user} onLogout={onLogout} collapsed={false} onCollapse={() => {}}
              location={location} showClose onClose={onMobileClose}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem("wa_user_session");
    return saved ? JSON.parse(saved) : null;
  });

  const navigate = useNavigate();
  const location = useLocation();

  const handleSetUser = (user: AppUser | null) => {
    if (user) {
      localStorage.setItem("wa_user_session", JSON.stringify(user));
    } else {
      localStorage.removeItem("wa_user_session");
    }
    setCurrentUser(user);
  };

  const [connected, setConnected]                   = useState(false);
  const [waUser, setWaUser]                         = useState<string | null>(null);
  const [number, setNumber]                         = useState<string | null>(null);
  const [toasts, setToasts]                         = useState<Toast[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen]             = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const addToast = (message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const handleStatusChange = (estado: EstadoWA, usuario: string | null, numero: string | null) => {
    setConnected(estado === "conectado");
    setWaUser(usuario);
    setNumber(numero);
  };

  const handleLogout = () => {
    handleSetUser(null);
    navigate("/");
  };

  useEffect(() => {
    const socketOrigin = new URL(import.meta.env.VITE_API_BASE_URL as string).origin;
    socketRef.current = io(socketOrigin, { path: "/whatsapp/socket.io" });
    return () => { socketRef.current?.disconnect(); };
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  if (!currentUser) {
    return <LoginView onSelectUser={handleSetUser} />;
  }

  const pageLabel = ROUTE_LABELS[location.pathname] ?? "Conexión";

  return (
    <div
      className="h-dvh overflow-hidden text-white flex font-sans selection:bg-[#25D366] selection:text-black"
      style={{ background: "#0a100d" }}
    >
      <Sidebar
        currentUser={currentUser}
        connected={connected}
        number={number}
        user={waUser}
        onLogout={handleLogout}
        collapsed={isSidebarCollapsed}
        onCollapse={setIsSidebarCollapsed}
        mobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      <main className="flex-1 flex flex-col h-dvh overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-4 md:px-5 bg-black/20 backdrop-blur-xl z-40 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger – mobile only */}
            <button
              onClick={() => setIsMobileOpen(true)}
              aria-label="Abrir menú"
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold">{pageLabel}</h2>
            <div className="hidden sm:block h-4 w-px bg-white/10" />
            <div className="hidden sm:block">
              <StatusBadge connected={connected} />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white leading-none">{currentUser.nombre}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Sesión Activa</p>
            </div>
            <img src={userAvatar} alt="Usuario" className="w-8 h-8 object-contain shrink-0" />
          </div>
        </header>

        {/* Warn banner */}
        {!connected && (
          <div className="bg-red-500/10 border-b border-red-500/20 py-1.5 px-4 flex items-center justify-center gap-3 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 text-center">
              WhatsApp no conectado. Algunas funciones están limitadas.
            </span>
          </div>
        )}

        {/* Views */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar">
          <Routes>
            <Route index element={<Navigate to="/conexion" replace />} />
            <Route path="/conexion" element={
              <ConnectionView
                apiUrl={`${BASE_URL}/api`}
                apiKey={currentUser.api_key}
                userName={currentUser.nombre}
                socket={socketRef.current}
                onStatusChange={handleStatusChange}
              />
            } />
            <Route path="/enviar" element={
              <SendView
                connected={connected}
                baseUrl={BASE_URL}
                apiKey={currentUser.api_key}
                onToast={addToast}
              />
            } />
            <Route path="/masivo" element={
              <MasivoSection
                isConnected={connected}
                socket={socketRef.current}
                apiKey={currentUser.api_key}
                onToast={addToast}
              />
            } />
            <Route path="/campanas" element={
              <CampaignsView
                baseUrl={BASE_URL}
                apiKey={currentUser.api_key}
                onToast={addToast}
              />
            } />
            <Route path="/mensajes" element={
              <MensajesView
                baseUrl={BASE_URL}
                apiKey={currentUser.api_key}
                onToast={addToast}
              />
            } />
            <Route path="/api" element={
              <ApiView
                apiKey={currentUser.api_key}
                userName={currentUser.nombre}
                baseUrl={BASE_URL}
              />
            } />
            <Route path="*" element={<Navigate to="/conexion" replace />} />
          </Routes>
        </div>

        {/* Toasts */}
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`px-4 py-2.5 rounded-xl flex items-center gap-3 border backdrop-blur-xl
                  ${toast.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-500"
                  : toast.type === "error"   ? "bg-red-500/10 border-red-500/20 text-red-500"
                  :                            "bg-blue-500/10 border-blue-500/20 text-blue-500"}`}
              >
                {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" />
                : toast.type === "error"  ? <XCircle className="w-5 h-5 shrink-0" />
                :                           <AlertCircle className="w-5 h-5 shrink-0" />}
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
