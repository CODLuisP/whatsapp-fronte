import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2, LogOut, RefreshCw, Terminal,
  Users, MessageSquare,
  TrendingUp, Send, XCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import logoWtsp from "./assets/logowtsp.png";

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

interface ReportSummary {
  mensajes: {
    total: number; enviados: number; fallidos: number; pendientes: number;
    tasa_exito: number;
    por_tipo: { texto: number; imagen: number; documento: number };
  };
  campanas: {
    total: number; completadas: number; con_errores: number;
    canceladas: number; en_proceso: number;
  };
}

interface DailyPoint {
  fecha: string; total: number; enviados: number; fallidos: number;
}

interface ConnectionViewProps {
  apiUrl: string;
  apiKey: string;
  userName: string;
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
  conectado: "bg-[#4ade80]", reconectando: "bg-yellow-400", error: "bg-red-600",
};
const TEXT_COLOR: Record<EstadoWA, string> = {
  desconectado: "text-red-400", conectando: "text-yellow-400", qr: "text-blue-400",
  conectado: "text-[#4ade80]", reconectando: "text-yellow-400", error: "text-red-400",
};
const LOG_ICON: Record<LogEntry["type"], string> = {
  success: "text-[#4ade80]", error: "text-red-400",
  warning: "text-yellow-400", info: "text-blue-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeNumero = (raw?: string | null) => raw?.match(/^(\d+)/)?.[1] ?? null;
const getNow = () => new Date().toLocaleTimeString("es-PE", { hour12: false });
const makeLog = (message: string, type: LogEntry["type"] = "info"): LogEntry =>
  ({ id: `${Date.now()}-${Math.random()}`, timestamp: getNow(), message, type });
const toSrc = (qr: string) => qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConnectionView({ apiUrl, apiKey, userName, socket, onStatusChange }: ConnectionViewProps) {

  const [waStatus,        setWaStatus]        = useState<WAStatus>({ estado: "desconectado" });
  const [qrSrc,           setQrSrc]           = useState<string | null>(null);
  const [qrPhase,         setQrPhase]         = useState<null | "waiting" | "qr" | "connected">(null);
  const [socketOk,        setSocketOk]        = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [logs,            setLogs]            = useState<LogEntry[]>([]);
  const [_lastUpdate,     setLastUpdate]      = useState<string>(getNow());

  const waStatusRef    = useRef<WAStatus>({ estado: "desconectado" });
  const qrPhaseRef     = useRef<null | "waiting" | "qr" | "connected">(null);
  const initializedRef = useRef(false);
  const qrCountRef     = useRef(0);
  const qrRetryRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowPollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const fastPollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadStatusRef  = useRef<() => Promise<EstadoWA>>(() => Promise.resolve("desconectado" as EstadoWA));
  const logEndRef      = useRef<HTMLDivElement | null>(null);

  const [summary,        setSummary]        = useState<ReportSummary | null>(null);
  const [dailyData,      setDailyData]      = useState<DailyPoint[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const [sumRes, dayRes] = await Promise.all([
        axios.get(`${apiUrl}/reports/summary`, { headers: authHeaders.current }),
        axios.get(`${apiUrl}/reports/daily?dias=7`, { headers: authHeaders.current }),
      ]);
      setSummary(sumRes.data.datos);
      setDailyData(dayRes.data.datos?.por_dia ?? []);
    } catch { /* silent */ }
    finally { setReportsLoading(false); }
  }, [apiUrl]);

  useEffect(() => { loadReports(); }, [loadReports]);

  useEffect(() => { waStatusRef.current = waStatus; }, [waStatus]);
  useEffect(() => { qrPhaseRef.current = qrPhase; }, [qrPhase]);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const stopFastPoll = useCallback(() => {
    if (fastPollRef.current) { clearInterval(fastPollRef.current); fastPollRef.current = null; }
  }, []);

  const startFastPoll = useCallback((pollFn: () => void) => {
    stopFastPoll();
    fastPollRef.current = setInterval(pollFn, 1_500);
  }, [stopFastPoll]);

  const authHeaders = useRef<Record<string, string>>({});
  useEffect(() => { authHeaders.current = apiKey ? { "x-api-key": apiKey } : {}; }, [apiKey]);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [...prev, makeLog(message, type)]);
    setLastUpdate(getNow());
  }, []);

  const applyStatus = useCallback((datos: WAStatus) => {
    setWaStatus(datos);
    onStatusChange?.(datos.estado, datos.usuario ?? null, datos.numero ?? null);
    if (datos.estado === "conectado") {
      if (qrRetryRef.current) { clearTimeout(qrRetryRef.current); qrRetryRef.current = null; }
      stopFastPoll();
      setQrPhase("connected");
      setQrSrc(null);
    }
  }, [onStatusChange, stopFastPoll]);

  const fetchQR = useCallback(async (forceEstado?: EstadoWA) => {
    const estadoActual = forceEstado ?? waStatusRef.current.estado;
    if (estadoActual === "conectado") return;
    setQrPhase("waiting");
    try {
      const { data } = await axios.get(`${apiUrl}/qr`, { headers: authHeaders.current });
      const d = data.datos ?? data;
      if (d?.qr) {
        setQrSrc(toSrc(d.qr));
        setQrPhase("qr");
        startFastPoll(() => loadStatusRef.current());
      } else if (d?.estado === "conectado") {
        applyStatus({ estado: "conectado", usuario: d.usuario, numero: normalizeNumero(d.numero) });
      } else {
        setQrPhase("waiting");
        qrRetryRef.current = setTimeout(() => fetchQR(), 2_000);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        addLog("API Key inválida — no se pudo cargar el QR", "error");
      } else {
        addLog("Error al cargar QR, reintentando...", "warning");
        qrRetryRef.current = setTimeout(() => fetchQR(), 3_000);
      }
    }
  }, [apiUrl, applyStatus, addLog, startFastPoll]);

  const desconectar = async () => {
    if (!confirm("¿Cerrar sesión de WhatsApp?")) return;
    setIsDisconnecting(true);
    try {
      await axios.post(`${apiUrl}/disconnect`, {}, { headers: authHeaders.current });
      const estadoReset: WAStatus = { estado: "desconectado", usuario: null, numero: null };
      setWaStatus(estadoReset);
      waStatusRef.current = estadoReset;
      onStatusChange?.("desconectado", null, null);
      setQrSrc(null);
      setQrPhase("waiting");
      qrCountRef.current = 0;
      addLog("Sesión cerrada — buscando QR...", "warning");
      fetchQR("desconectado");
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) addLog("API Key inválida — no se pudo cerrar sesión", "error");
      else addLog("Error al cerrar sesión", "error");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const loadStatus = useCallback(async (): Promise<EstadoWA> => {
    try {
      const { data } = await axios.get(`${apiUrl}/status`, { headers: authHeaders.current });
      const raw: WAStatus = data.datos ?? data;
      const normalizado = { ...raw, numero: normalizeNumero(raw.numero) };
      applyStatus(normalizado);
      if (raw.estado === "conectado") {
        if (qrPhaseRef.current !== "connected") addLog(`WhatsApp conectado${raw.usuario ? ` como ${raw.usuario}` : ""}`, "success");
        stopFastPoll();
        setQrPhase("connected");
        setQrSrc(null);
        if (qrRetryRef.current) { clearTimeout(qrRetryRef.current); qrRetryRef.current = null; }
      }
      return raw.estado;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) addLog("API Key inválida o sin permisos (401/403)", "error");
      else addLog("Error al obtener estado", "error");
      applyStatus({ estado: "error" });
      return "error";
    }
  }, [apiUrl, applyStatus, addLog, stopFastPoll]);

  loadStatusRef.current = loadStatus;

  useEffect(() => {
    if (!socket) return;
    const onConn = () => { setSocketOk(true);  addLog("Socket.IO conectado", "success"); };
    const onDisc = () => { setSocketOk(false); addLog("Socket.IO desconectado", "warning"); };
    const onQR = ({ qr }: { qr: string }) => {
      if (qrPhaseRef.current === "connected") return;
      qrCountRef.current += 1;
      setQrSrc(toSrc(qr));
      setQrPhase("qr");
      addLog(qrCountRef.current === 1 ? "QR listo — escanea con WhatsApp" : `QR renovado (${qrCountRef.current}) — vuelve a escanear`, "info");
      startFastPoll(() => loadStatusRef.current());
      if (qrRetryRef.current) { clearTimeout(qrRetryRef.current); qrRetryRef.current = null; }
    };
    const onEstado = ({ estado, usuario, numero, mensaje }: WAStatus & { mensaje?: string }) => {
      if (qrPhaseRef.current === "connected" && estado !== "desconectado" && estado !== "error") return;
      applyStatus({ estado, usuario, numero: normalizeNumero(numero) });
      if (estado === "conectado") { stopFastPoll(); setQrPhase("connected"); setQrSrc(null); if (qrRetryRef.current) { clearTimeout(qrRetryRef.current); qrRetryRef.current = null; } }
      const fallback: Record<string, string> = { reconectando: "Reconectando...", conectando: "Vinculando dispositivo...", conectado: usuario ? `Conectado como ${usuario}` : "WhatsApp conectado", desconectado: "Desconectado", error: "Error de conexión", qr: "Generando QR..." };
      addLog(mensaje || fallback[estado] || `Estado: ${estado}`, estado === "conectado" ? "success" : "info");
    };
    socket.on("connect", onConn);
    socket.on("disconnect", onDisc);
    socket.on("qr_actualizado", onQR);
    socket.on("estado_conexion", onEstado);
    if (socket.connected) setSocketOk(true);
    return () => {
      socket.off("connect", onConn);
      socket.off("disconnect", onDisc);
      socket.off("qr_actualizado", onQR);
      socket.off("estado_conexion", onEstado);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, applyStatus, addLog]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    loadStatusRef.current().then((estado) => {
      if (estado === "conectado") addLog("WhatsApp conectado y listo", "success");
      else { setQrPhase("waiting"); addLog("Buscando QR...", "info"); fetchQR(estado); }
    });
    slowPollRef.current = setInterval(() => loadStatusRef.current(), 5_000);
    return () => {
      if (slowPollRef.current) clearInterval(slowPollRef.current);
      stopFastPoll();
      if (qrRetryRef.current) clearTimeout(qrRetryRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derivados ─────────────────────────────────────────────────────────────
  const isConnected = qrPhase === "connected";
  const estadoBadge = isConnected ? ("conectado" as EstadoWA) : waStatus.estado;
  const showBadge   = qrPhase !== null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">


      {/* ── Grid principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">

        {/* Panel QR / Conectado */}
        <div className="relative bg-[#000000] border-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center min-h-[260px]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full"
              style={{ background: isConnected
                ? "radial-gradient(circle, rgba(74,222,128,0.05) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(74,222,128,0.02) 0%, transparent 70%)" }} />
          </div>

          <AnimatePresence mode="wait">
            {isConnected && (
              <motion.div key="connected"
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative z-10 flex flex-col items-center gap-3 px-6 py-5 text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full blur-xl bg-[#4ade80]/[0.06] scale-150" />
                  <div className="relative bg-[#4ade80]/10 border border-[#4ade80]/20 p-3 rounded-full">
                    <img src={logoWtsp} alt="WhatsApp" className="w-10 h-10 object-contain" />
                  </div>
                </div>
                <div>
                  <p className="text-base font-black text-white tracking-tight">WhatsApp Conectado</p>
                  <p className="text-white/75 text-xs mt-0.5">
                    Sesión activa como{" "}
                    <span className="text-[#4ade80] font-semibold">{waStatus.usuario || userName || "usuario"}</span>
                  </p>
                  {waStatus.numero && (
                    <p className="text-white/70 text-[10px] mt-0.5 font-mono">+{waStatus.numero}</p>
                  )}
                </div>
                <button onClick={desconectar} disabled={isDisconnecting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold
                             bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/15
                             disabled:opacity-40 transition-all">
                  {isDisconnecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                  {isDisconnecting ? "Cerrando..." : "Cerrar Sesión"}
                </button>
              </motion.div>
            )}

            {/* ── QR listo ── */}
            {!isConnected && qrPhase === "qr" && qrSrc && (
              <motion.div key="qr"
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative z-10 flex flex-col items-center gap-3 px-4 py-4">
                <div className="text-center">
                  <p className="text-sm font-black text-white">Escanea el QR</p>
                  <p className="text-white/70 text-[10px] mt-0.5">WhatsApp → Dispositivos vinculados → Vincular</p>
                </div>
                <div className="relative group cursor-pointer" onClick={() => fetchQR()}>
                  <div className="absolute -inset-2 rounded-xl opacity-30"
                    style={{ background: "radial-gradient(circle, rgba(74,222,128,0.3) 0%, transparent 70%)" }} />
                  <div className="relative p-2 bg-white rounded-lg">
                    <img src={qrSrc} alt="QR WhatsApp" className="w-40 h-40 block" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1.5 rounded-lg">
                      <RefreshCw className="w-3.5 h-3.5 text-white" />
                      <span className="text-white text-[11px] font-bold">Actualizar</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => fetchQR()}
                  className="text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white/70
                             px-3 py-1 rounded-lg border-0 hover:border-white/10 transition-all">
                  ↻ Regenerar QR
                </button>
              </motion.div>
            )}

            {/* ── Esperando ── */}
            {!isConnected && (qrPhase === "waiting" || qrPhase === null) && (
              <motion.div key="waiting"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="relative z-10 flex flex-col items-center gap-3 px-6 py-6">
                <div className="w-36 h-36 rounded-xl border-0 bg-white/[0.02]
                                flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 text-white/20 animate-spin" style={{ animationDuration: "2s" }} />
                  <p className="text-[10px] text-white/20 text-center leading-relaxed px-3">
                    {waStatus.estado === "conectando"   ? "Vinculando dispositivo..." :
                     waStatus.estado === "reconectando" ? "Verificando vinculación..." :
                     qrPhase === null                   ? "Iniciando..." : "Generando QR..."}
                  </p>
                </div>
                {qrPhase !== null && (
                  <button onClick={() => fetchQR("desconectado")}
                    className="text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white/70
                               px-3 py-1 rounded-lg border-0 hover:border-white/10 transition-all">
                    ↻ Forzar QR
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Panel lateral */}
        <div className="flex flex-col gap-3">

          {/* Tarjeta sesión */}
          <div className="relative bg-[#000000] border-0 rounded-xl p-3 space-y-2 overflow-hidden">
            <p className="text-[8px] font-bold uppercase tracking-widest text-gray-200">Sesión</p>
            <div className="space-y-1.5">
              <div className="bg-[#25D366]/[0.03] border-0 rounded-lg p-2.5 flex items-center gap-2.5">
                <Users className="w-3.5 h-3.5 text-white/70 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] text-white/70 uppercase tracking-wider">Usuario</p>
                  <p className="text-xs font-bold text-white truncate">{userName || "—"}</p>
                </div>
              </div>
              <div className="bg-[#25D366]/[0.03] border-0 rounded-lg p-2.5 flex items-center gap-2.5">
                <MessageSquare className="w-3.5 h-3.5 text-white/70 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[8px] text-white/70 uppercase tracking-wider">Número WhatsApp</p>
                  <p className="text-xs font-bold text-white font-mono truncate">
                    {waStatus.numero ? `+${waStatus.numero}` : "—"}
                  </p>
                </div>
              </div>
            </div>
            {isConnected ? (
              <button onClick={desconectar} disabled={isDisconnecting}
                className="w-full py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5
                           bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/15
                           disabled:opacity-40 transition-all">
                {isDisconnecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                {isDisconnecting ? "Cerrando..." : "Cerrar sesión"}
              </button>
            ) : (
              <button onClick={() => fetchQR("desconectado")}
                className="w-full py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5
                           bg-[#4ade80]/10 hover:bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/15 transition-all">
                <RefreshCw className="w-3 h-3" />
                Obtener nuevo QR
              </button>
            )}
          </div>

          {/* Tarjeta estado */}
          <div className="relative bg-[#000000] border-0 rounded-xl p-3 flex-1 overflow-hidden">
            <p className="text-[8px] font-bold uppercase tracking-widest text-gray-200 mb-2">Estado del sistema</p>
            <div className="space-y-2">
              {[
                {
                  label: "WhatsApp API",
                  value: showBadge ? LABELS[estadoBadge] : "—",
                  color: isConnected ? "text-[#4ade80]" : TEXT_COLOR[estadoBadge],
                  dot: isConnected ? "bg-[#4ade80]" : DOT_COLOR[estadoBadge],
                  ping: true,
                },
                {
                  label: "Socket.IO",
                  value: socketOk ? "Conectado" : "Inactivo",
                  color: socketOk ? "text-[#4ade80]" : "text-white/70",
                  dot: socketOk ? "bg-[#4ade80]" : "bg-white/20",
                  ping: socketOk,
                },
                {
                  label: "Polling",
                  value: "Activo",
                  color: "text-white/75",
                  dot: "bg-white/20",
                  ping: false,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative flex h-2 w-2">
                      {item.ping && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${item.dot} opacity-50`} />}
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${item.dot}`} />
                    </div>
                    <span className="text-[11px] text-white/75">{item.label}</span>
                  </div>
                  <span className={`text-[11px] font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
            {isConnected && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex items-center gap-2 bg-[#4ade80]/[0.07] border border-[#4ade80]/10 rounded-lg px-2.5 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                <p className="text-[10px] text-[#4ade80]/80 font-medium">Todo listo — listo para enviar</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Log de eventos ── */}
      <div className="relative bg-[#000000] border-0 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Terminal className="w-3 h-3 text-[#4ade80]" />
            <span className="text-[10px] font-bold text-gray-200 uppercase tracking-widest">Registro</span>
          </div>
          <button onClick={() => setLogs([makeLog("Registro limpiado", "info")])}
            className="text-[9px] font-bold uppercase tracking-wider text-gray-300 hover:text-white/70 transition-colors px-2 py-0.5 rounded hover:bg-white/[0.04]">
            Limpiar
          </button>
        </div>
        <div className="divide-y divide-white/[0.03] max-h-40 overflow-y-auto custom-log-scroll">
          {logs.length === 0 ? (
            <div className="py-5 flex items-center justify-center">
              <p className="text-[10px] text-white/15 font-mono">Sin eventos</p>
            </div>
          ) : (
            [...logs].reverse().map((log) => (
              <motion.div key={log.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}
                className="flex items-center gap-3 px-4 py-1.5 hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] font-mono text-white/20 shrink-0 w-14">{log.timestamp}</span>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  log.type === "success" ? "bg-[#4ade80]"
                  : log.type === "error"   ? "bg-red-400"
                  : log.type === "warning" ? "bg-yellow-400"
                  : "bg-blue-400"
                }`} />
                <span className={`text-[10px] font-mono flex-1 ${LOG_ICON[log.type]}`}>{log.message}</span>
              </motion.div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* ── Reportes ── */}
      <div className="space-y-3">

        {/* Header reportes */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#4ade80]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Reportes</span>
          </div>
          <button onClick={loadReports} disabled={reportsLoading}
            className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-white/25
                       hover:text-white/60 px-2 py-1 rounded hover:bg-white/[0.04] transition-all disabled:opacity-40">
            <RefreshCw className={`w-3 h-3 ${reportsLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        {/* Stats generales */}
        {summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Total mensajes",  value: summary.mensajes.total.toLocaleString(),     color: "text-white",       Icon: Send        },
              { label: "Enviados",        value: summary.mensajes.enviados.toLocaleString(),   color: "text-[#4ade80]",   Icon: CheckCircle2 },
              { label: "Fallidos",        value: summary.mensajes.fallidos.toLocaleString(),   color: "text-[#f87171]",   Icon: XCircle      },
              { label: "Tasa de éxito",   value: `${summary.mensajes.tasa_exito}%`,            color: "text-[#60a5fa]",   Icon: TrendingUp   },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className="bg-[#000000] rounded-xl px-3 py-3 flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${color} opacity-60`} />
                <div>
                  <p className="text-[9px] font-semibold text-gray-200  mb-0.5">{label}</p>
                  <p className={`text-base font-black leading-none ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-[#000000] rounded-xl h-14 animate-pulse" />
            ))}
          </div>
        )}

        {/* Grid: gráfica + desglose */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">

          {/* Gráfica últimos 7 días */}
          <div className="bg-[#000000] rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Analítica</p>
                <h3 className="text-sm font-black text-white">Últimos 7 días</h3>
              </div>
              {dailyData.length > 0 && (
                <div className="text-right">
                  <p className="text-lg font-black text-[#4ade80] leading-none">
                    {dailyData.reduce((a, d) => a + d.enviados, 0).toLocaleString()}
                  </p>
                  <p className="text-[8px] text-white/30 uppercase tracking-wider">enviados</p>
                </div>
              )}
            </div>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={dailyData.map(d => ({
                  name: d.fecha === new Date().toISOString().slice(0,10)
                    ? "Hoy"
                    : new Date(d.fecha + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" }),
                  enviados: d.enviados,
                  fallidos: d.fallidos,
                }))} barCategoryGap="35%">
                  <XAxis dataKey="name"
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700 }}
                    axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "#040704", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: "rgba(255,255,255,0.6)", fontWeight: 700 }}
                    itemStyle={{ color: "#4ade80" }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="enviados" name="Enviados" radius={[4,4,0,0]}>
                    {dailyData.map((d, i) => (
                      <Cell key={i}
                        fill={d.enviados === Math.max(...dailyData.map(x => x.enviados)) && d.enviados > 0
                          ? "#4ade80" : "rgba(74,222,128,0.2)"} />
                    ))}
                  </Bar>
                  <Bar dataKey="fallidos" name="Fallidos" radius={[4,4,0,0]} fill="rgba(248,113,113,0.3)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[130px] flex items-center justify-center">
                <p className="text-xs text-white/20">Sin datos en este período</p>
              </div>
            )}
          </div>

          {/* Desglose por tipo + campañas */}
          <div className="space-y-2">

            {/* Por tipo */}
            <div className="bg-[#000000] rounded-xl p-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-gray-200 mb-2.5">Por tipo de mensaje</p>
              {summary ? (
                <div className="space-y-2">
                  {[
                    { label: "Texto",     value: summary.mensajes.por_tipo.texto,     color: "#4ade80" },
                    { label: "Imagen",    value: summary.mensajes.por_tipo.imagen,    color: "#60a5fa" },
                    { label: "Documento", value: summary.mensajes.por_tipo.documento, color: "#fb923c" },
                  ].map(({ label, value, color }) => {
                    const pct = summary.mensajes.total > 0 ? Math.round((value / summary.mensajes.total) * 100) : 0;
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-[9px] mb-1">
                          <span className="text-gray-300">{label}</span>
                          <span className="font-bold font-mono" style={{ color }}>{value.toLocaleString()} <span className="text-white/25">({pct}%)</span></span>
                        </div>
                        <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="h-full rounded-full" style={{ background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-6 bg-white/[0.03] rounded animate-pulse" />)}</div>
              )}
            </div>

            {/* Campañas */}
            <div className="bg-[#000000] rounded-xl p-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-gray-200 mb-2.5">Campañas</p>
              {summary ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Total",       value: summary.campanas.total,       color: "text-white"      },
                    { label: "Completadas", value: summary.campanas.completadas, color: "text-[#4ade80]"  },
                    { label: "Con errores", value: summary.campanas.con_errores, color: "text-[#fb923c]"  },
                    { label: "En proceso",  value: summary.campanas.en_proceso,  color: "text-[#60a5fa]"  },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white/[0.03] rounded-lg px-2.5 py-2 text-center">
                      <p className={`text-lg font-black leading-none ${color}`}>{value}</p>
                      <p className="text-[7px] text-gray-300 uppercase tracking-wider mt-0.5 font-bold">{label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-white/[0.03] rounded-lg animate-pulse" />)}</div>
              )}
            </div>

          </div>
        </div>
      </div>

      <style>{`
        .custom-log-scroll::-webkit-scrollbar { width: 4px; }
        .custom-log-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-log-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.04); border-radius: 10px; }
      `}</style>
    </div>
  );
}
