import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { motion } from "motion/react";
import { CheckCircle2, LogOut, RefreshCw, Terminal, Users, MessageSquare } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoWA = "desconectado" | "conectando" | "qr" | "conectado" | "reconectando" | "error";

interface WAStatus {
  estado: EstadoWA;
  usuario?: string | null;
  numero?: string | null;
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

interface ConnectionViewProps {
  apiUrl: string;
  apiKey: string;          // ← nuevo prop obligatorio
  socket?: any | null;
  onStatusChange?: (estado: EstadoWA, usuario: string | null, numero: string | null) => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const LABELS: Record<EstadoWA, string> = {
  desconectado: "Desconectado", conectando: "Conectando...", qr: "Esperando QR",
  conectado: "Conectado", reconectando: "Reconectando...", error: "Error",
};
const DOT_COLOR: Record<EstadoWA, string> = {
  desconectado: "bg-red-500", conectando: "bg-yellow-400", qr: "bg-blue-400",
  conectado: "bg-[#25D366]", reconectando: "bg-yellow-400", error: "bg-red-600",
};
const TEXT_COLOR: Record<EstadoWA, string> = {
  desconectado: "text-red-500", conectando: "text-yellow-400", qr: "text-blue-400",
  conectado: "text-[#25D366]", reconectando: "text-yellow-400", error: "text-red-500",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeNumero = (raw?: string | null) => raw?.match(/^(\d+)/)?.[1] ?? null;
const getNow = () => new Date().toLocaleTimeString("es-PE", { hour12: false });
const makeLog = (message: string, type: LogEntry["type"] = "info"): LogEntry =>
  ({ id: `${Date.now()}-${Math.random()}`, timestamp: getNow(), message, type });
const toSrc = (qr: string) => qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, accent }: {
  title: string; value: string; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-white/5 p-3 rounded-xl flex items-center gap-3 hover:border-white/10 transition-colors">
      <div className={`p-2 rounded-lg ${accent}/10`}>
        <Icon className={`w-4 h-4 ${accent.replace("bg-", "text-")}`} />
      </div>
      <div className="min-w-0">
        <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">{title}</p>
        <p className="text-base font-bold text-white mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConnectionView({ apiUrl, apiKey, socket, onStatusChange }: ConnectionViewProps) {

  const [waStatus,        setWaStatus]        = useState<WAStatus>({ estado: "desconectado" });
  const [qrSrc,           setQrSrc]           = useState<string | null>(null);
  const [qrPhase,         setQrPhase]         = useState<null | "waiting" | "qr" | "connected">(null);
  const [socketOk,        setSocketOk]        = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [logs,            setLogs]            = useState<LogEntry[]>([]);

  const waStatusRef    = useRef<WAStatus>({ estado: "desconectado" });
  const initializedRef = useRef(false);
  const qrCountRef     = useRef(0);

  useEffect(() => { waStatusRef.current = waStatus; }, [waStatus]);

  // ── Headers con API Key ───────────────────────────────────────────────────
  // Se recalcula si cambia apiKey
  const authHeaders = useRef<Record<string, string>>({});
  useEffect(() => {
    authHeaders.current = apiKey ? { "x-api-key": apiKey } : {};
  }, [apiKey]);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [...prev, makeLog(message, type)]);
  }, []);

  // ── applyStatus ───────────────────────────────────────────────────────────
  const applyStatus = useCallback((datos: WAStatus) => {
    setWaStatus(datos);
    onStatusChange?.(datos.estado, datos.usuario ?? null, datos.numero ?? null);
    if (datos.estado === "conectado") {
      setQrPhase("connected");
      setQrSrc(null);
    }
  }, [onStatusChange]);

  // ── loadStatus ────────────────────────────────────────────────────────────
  const loadStatus = useCallback(async (): Promise<EstadoWA> => {
    try {
      const { data } = await axios.get(`${apiUrl}/status`, { headers: authHeaders.current });
      const raw: WAStatus = data.datos ?? data;
      applyStatus({ ...raw, numero: normalizeNumero(raw.numero) });
      return raw.estado;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        addLog("API Key inválida o sin permisos (401/403)", "error");
      } else {
        addLog("Error al obtener estado", "error");
      }
      applyStatus({ estado: "error" });
      return "error";
    }
  }, [apiUrl, applyStatus, addLog]);

  // ── fetchQR ───────────────────────────────────────────────────────────────
  const fetchQR = useCallback(async () => {
    if (waStatusRef.current.estado === "conectado") return;
    setQrPhase("waiting");
    try {
      const { data } = await axios.get(`${apiUrl}/qr`, { headers: authHeaders.current });
      const d = data.datos ?? data;
      if (d?.qr) {
        setQrSrc(toSrc(d.qr));
        setQrPhase("qr");
      } else if (d?.estado === "conectado") {
        applyStatus({ estado: "conectado", usuario: d.usuario, numero: normalizeNumero(d.numero) });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        addLog("API Key inválida — no se pudo cargar el QR", "error");
      } else {
        addLog("Error al cargar QR", "error");
      }
    }
  }, [apiUrl, applyStatus, addLog]);

  // ── desconectar ───────────────────────────────────────────────────────────
  const desconectar = async () => {
    if (!confirm("¿Cerrar sesión de WhatsApp?")) return;
    setIsDisconnecting(true);
    try {
      await axios.post(`${apiUrl}/disconnect`, {}, { headers: authHeaders.current });
      setWaStatus({ estado: "desconectado" });
      setQrSrc(null);
      setQrPhase("waiting");
      onStatusChange?.("desconectado", null, null);
      qrCountRef.current = 0;
      addLog("Sesión cerrada — esperando nuevo QR...", "warning");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        addLog("API Key inválida — no se pudo cerrar sesión", "error");
      } else {
        addLog("Error al cerrar sesión", "error");
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  // ── Socket.IO ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onConn = () => { setSocketOk(true);  addLog("Socket.IO conectado", "success"); };
    const onDisc = () => { setSocketOk(false); addLog("Socket.IO desconectado", "warning"); };

    const onQR = ({ qr }: { qr: string }) => {
      qrCountRef.current += 1;
      setQrSrc(toSrc(qr));
      setQrPhase("qr");
      const msg = qrCountRef.current === 1
        ? "QR listo — escanea con WhatsApp"
        : `🔄 QR renovado (${qrCountRef.current}) — vuelve a escanear`;
      addLog(msg, "info");
    };

    const onEstado = ({ estado, usuario, numero, mensaje }: WAStatus & { mensaje?: string }) => {
      applyStatus({ estado, usuario, numero: normalizeNumero(numero) });
      const fallback: Record<string, string> = {
        reconectando: "Reconectando...",
        conectando:   "Vinculando dispositivo...",
        conectado:    usuario ? `Conectado como ${usuario}` : "WhatsApp conectado",
        desconectado: "Desconectado",
        error:        "Error de conexión",
        qr:           "Generando QR...",
      };
      addLog(
        mensaje || fallback[estado] || `Estado: ${estado}`,
        estado === "conectado" ? "success" : "info"
      );
    };

    socket.on("connect",          onConn);
    socket.on("disconnect",       onDisc);
    socket.on("qr_actualizado",   onQR);
    socket.on("estado_conexion",  onEstado);
    if (socket.connected) setSocketOk(true);

    return () => {
      socket.off("connect",         onConn);
      socket.off("disconnect",      onDisc);
      socket.off("qr_actualizado",  onQR);
      socket.off("estado_conexion", onEstado);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, applyStatus, addLog]);

  // ── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    loadStatus().then((estado) => {
      if (estado === "conectado") {
        addLog("WhatsApp conectado y listo", "success");
      } else {
        setQrPhase("waiting");
        addLog("Esperando QR del servidor...", "info");
        fetchQR();
      }
    });

    const si = setInterval(loadStatus, 5_000);
    return () => clearInterval(si);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const estado      = waStatus.estado;
  const isConnected = estado === "conectado";
  const showBadge   = qrPhase !== null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Panel izquierdo */}
      <div className="bg-[#111111] rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-105">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-[#25D366] to-transparent opacity-30" />

        {/* Conectado */}
        {isConnected && (
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-[#25D366] rounded-full" />
              <div className="bg-[#25D366] p-5 rounded-full relative">
                <CheckCircle2 className="w-20 h-20 text-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">WhatsApp Conectado</p>
              <p className="text-gray-400 mt-1 text-xs">
                Como <span className="text-white font-semibold">{waStatus.usuario || "usuario"}</span>
              </p>
            </div>
            <button onClick={desconectar} disabled={isDisconnecting}
              className="px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs
                         font-semibold transition-all flex items-center gap-2 border border-red-500/20
                         disabled:opacity-50 disabled:cursor-not-allowed">
              {isDisconnecting
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <LogOut className="w-3.5 h-3.5" />}
              {isDisconnecting ? "Cerrando..." : "Cerrar Sesión"}
            </button>
          </motion.div>
        )}

        {/* QR listo */}
        {!isConnected && qrPhase === "qr" && qrSrc && (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="text-center">
              <p className="text-base font-bold text-white">Vincular Dispositivo</p>
              <p className="text-xs text-gray-400 mt-0.5">WhatsApp → Dispositivos vinculados → Vincular</p>
            </div>
            <div className="relative p-3 bg-white rounded-xl group cursor-pointer" onClick={fetchQR}>
              <img src={qrSrc} alt="QR" className="w-52 h-52" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                <div className="p-2.5 bg-white rounded-full text-black">
                  <RefreshCw className="w-5 h-5" />
                </div>
              </div>
            </div>
            <button onClick={fetchQR}
              className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs transition-all border border-white/10">
              ↻ Actualizar QR
            </button>
          </div>
        )}

        {/* Esperando / vinculando */}
        {!isConnected && (qrPhase === "waiting" || qrPhase === null) && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-52 h-52 bg-white/5 rounded-xl flex flex-col items-center justify-center gap-3 border border-white/5">
              <RefreshCw className="w-7 h-7 text-gray-500 animate-spin" />
              <p className="text-[11px] text-gray-500 text-center px-4 leading-relaxed">
                {estado === "conectando"   ? "📲 Vinculando dispositivo..." :
                 estado === "reconectando" ? "🔄 Verificando vinculación..." :
                 qrPhase === null          ? "" :
                                            "Esperando QR..."}
              </p>
            </div>
            {qrPhase !== null && (
              <button onClick={fetchQR}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs transition-all border border-white/10">
                ↻ Forzar QR
              </button>
            )}
          </div>
        )}
      </div>

      {/* Panel derecho */}
      <div className="flex flex-col gap-4">

        <div className="grid grid-cols-2 gap-3">
          <StatCard title="Usuario" value={waStatus.usuario || "—"} icon={Users}         accent="bg-blue-500"  />
          <StatCard title="Número"  value={waStatus.numero  || "—"} icon={MessageSquare} accent="bg-[#25D366]" />
        </div>

        {/* Badge */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between min-h-[44px]">
          {showBadge ? (
            <>
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${DOT_COLOR[estado]} opacity-60`} />
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${DOT_COLOR[estado]}`} />
                </div>
                <span className={`text-xs font-semibold ${TEXT_COLOR[estado]}`}>{LABELS[estado]}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-600 font-mono uppercase tracking-wider">
                <span className={`w-1.5 h-1.5 rounded-full ${socketOk ? "bg-[#25D366]" : "bg-gray-700"}`} />
                Socket {socketOk ? "OK" : "—"}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-white/10 animate-pulse" />
              <span className="text-xs text-gray-700">Cargando...</span>
            </div>
          )}
        </div>

        {/* Log box */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl flex flex-col flex-1 min-h-[260px]">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-[#25D366]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Registro</span>
            </div>
            <button onClick={() => setLogs([makeLog("Log limpiado", "info")])}
              className="text-[10px] text-gray-600 hover:text-white uppercase tracking-tighter transition-colors">
              Limpiar
            </button>
          </div>
          <div className="p-3 font-mono text-[10px] overflow-y-auto flex flex-col gap-1" style={{ maxHeight: 280 }}>
            {logs.length === 0
              ? <span className="text-gray-800">—</span>
              : logs.map((log) => (
                <div key={log.id} className="flex gap-2 animate-in slide-in-from-left-2 duration-150">
                  <span className="text-gray-700 shrink-0">[{log.timestamp}]</span>
                  <span className={
                    log.type === "success" ? "text-green-400"
                    : log.type === "error"   ? "text-red-400"
                    : log.type === "warning" ? "text-yellow-400"
                    : "text-blue-400"
                  }>{log.message}</span>
                </div>
              ))
            }
          </div>
        </div>

      </div>
    </div>
  );
}