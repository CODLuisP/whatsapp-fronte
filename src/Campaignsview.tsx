import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart3, Search, X, RefreshCw, Trash2, MessageSquare, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessageDetail {
  id: string; telefono: string; texto: string; tipo: string;
  estado: "enviado" | "fallido" | "pendiente"; error?: string;
}
interface Campaign {
  id: string; nombre: string;
  estado: "en_proceso" | "completada" | "completada_con_errores" | "cancelada" | "error" | "pendiente";
  total_mensajes: number; enviados: number; fallidos: number; pendientes: number;
  porcentaje_completado: number; delay_ms: number; created_at: string; creado_en?: string;
}
interface CampaignDetail extends Campaign { mensajes: MessageDetail[]; }
interface CampaignsViewProps {
  baseUrl: string; apiKey: string;
  onToast: (message: string, type: "success" | "error" | "info") => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusConfig = {
  completada:             { label: "Completada",   color: "#4ade80", bg: "#4ade8015" },
  completada_con_errores: { label: "Con errores",  color: "#fb923c", bg: "#fb923c15" },
  en_proceso:             { label: "En proceso",   color: "#60a5fa", bg: "#60a5fa15" },
  cancelada:              { label: "Cancelada",    color: "#fbbf24", bg: "#fbbf2415" },
  error:                  { label: "Error",        color: "#f87171", bg: "#f8717115" },
  pendiente:              { label: "Pendiente",    color: "#9ca3af", bg: "#9ca3af15" },
};
const msgStatusConfig = {
  enviado:   { color: "#4ade80", bg: "#4ade8015" },
  fallido:   { color: "#f87171", bg: "#f8717115" },
  pendiente: { color: "#60a5fa", bg: "#60a5fa15" },
};


const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const fmtDateShort = (d: string) =>
  new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ height: "100%", background: color, borderRadius: 4 }} />
    </div>
  );
}

// ─── Last 5 Days Chart ────────────────────────────────────────────────────────

function Last5DaysChart({ campaigns }: { campaigns: Campaign[] }) {
  const data = useMemo(() => {
    // Generar los últimos 5 días (hoy + 4 anteriores)
    const days: { date: Date; label: string; key: string }[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const label = i === 0 ? "Hoy" : d.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
      days.push({ date: d, label, key });
    }

    // Sumar enviados por día
    const counts: Record<string, number> = {};
    days.forEach(d => { counts[d.key] = 0; });

    campaigns.forEach(c => {
      const fecha = c.created_at || c.creado_en;
      if (!fecha) return;
      const key = new Date(fecha).toISOString().slice(0, 10);
      if (key in counts) counts[key] += c.enviados || 0;
    });

    return days.map(d => ({ name: d.label, mensajes: counts[d.key], key: d.key }));
  }, [campaigns]);

  const maxVal = Math.max(...data.map(d => d.mensajes), 1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#040704] border border-white/[0.08] rounded-lg px-3 py-2">
        <p className="text-[10px] text-white/60 font-bold">{label}</p>
        <p className="text-sm font-black text-[#4ade80]">{payload[0].value.toLocaleString()}</p>
        <p className="text-[9px] text-white/30">mensajes enviados</p>
      </div>
    );
  };

  const totalPeriod = data.reduce((a, d) => a + d.mensajes, 0);

  return (
    <div className="bg-[#040704] rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Analítica</p>
          <h3 className="text-sm font-black text-white">Últimos 5 días</h3>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-[#4ade80] leading-none">{totalPeriod.toLocaleString()}</p>
          <p className="text-[8px] text-white/30 uppercase tracking-wider">msgs en el periodo</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} barCategoryGap="35%">
          <XAxis dataKey="name"
            tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700 }}
            axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="mensajes" radius={[5, 5, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index}
                fill={entry.mensajes === maxVal && maxVal > 0 ? "#4ade80" : "rgba(74,222,128,0.2)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({ c, onClick }: { c: Campaign; onClick: () => void }) {
  const cfg   = statusConfig[c.estado] ?? statusConfig.pendiente;
  const pct   = c.porcentaje_completado ?? 0;
  const fecha = c.created_at || c.creado_en || "";

  return (
    <motion.div layoutId={`card-${c.id}`} whileHover={{ y: -2 }} onClick={onClick}
      className="bg-[#040704] rounded-xl p-3 cursor-pointer relative overflow-hidden transition-colors hover:bg-[#060a06]">
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${cfg.color}08 0%, transparent 70%)` }} />

      {/* Header */}
      <div className="flex justify-between items-start gap-2 mb-2.5">
        <p className="text-xs font-bold text-white truncate flex-1">{c.nombre}</p>
        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0 flex items-center gap-1"
          style={{ background: cfg.bg, color: cfg.color }}>
          <span className="w-1 h-1 rounded-full" style={{ background: cfg.color }} />
          {cfg.label}
        </span>
      </div>

      {/* Fecha y hora */}
      {fecha && (
        <div className="flex items-center gap-1.5 mb-2.5">
          <Clock className="w-2.5 h-2.5 text-white/25 shrink-0" />
          <span className="text-[9px] text-white/40 font-mono">{fmtDateShort(fecha)}</span>
          <span className="text-[9px] text-[#4ade80]/60 font-mono font-bold">{fmtTime(fecha)}</span>
        </div>
      )}

      {/* Progress */}
      <div className="mb-2.5">
        <div className="flex justify-between text-[9px] mb-1">
          <span className="text-white/30">Progreso</span>
          <span className="font-bold" style={{ color: cfg.color }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} color={cfg.color} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { l: "Enviados", v: c.enviados,      c: "#4ade80" },
          { l: "Fallidos", v: c.fallidos,       c: "#f87171" },
          { l: "Total",    v: c.total_mensajes, c: "#9ca3af" },
        ].map(({ l, v, c: col }) => (
          <div key={l} className="bg-white/[0.03] rounded-lg py-1.5 text-center">
            <p className="text-sm font-black leading-none" style={{ color: col }}>{v}</p>
            <p className="text-[7px] text-white/25 uppercase tracking-wider mt-0.5 font-bold">{l}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ campaignId, baseUrl, apiKey, onClose, onToast, onDeleted }: {
  campaignId: string; baseUrl: string; apiKey: string;
  onClose: () => void; onToast: (m: string, t: "success"|"error"|"info") => void; onDeleted: () => void;
}) {
  const [detail,     setDetail]     = useState<CampaignDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [msgFilter,  setMsgFilter]  = useState<"all"|"enviado"|"fallido"|"pendiente">("all");
  const [expanded,   setExpanded]   = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${baseUrl}/api/campaigns/${campaignId}`, { headers: { "x-api-key": apiKey } });
        const d = await r.json();
        const raw = d.datos;
        setDetail({ ...raw.campaña, mensajes: raw.mensajes || [] });
      } catch { onToast("Error cargando detalle", "error"); }
      finally { setLoading(false); }
    };
    load();
  }, [campaignId]);

  const cancel = async () => {
    setCancelling(true);
    try {
      await fetch(`${baseUrl}/api/campaigns/${campaignId}/cancel`, { method: "POST", headers: { "x-api-key": apiKey } });
      onToast("Campaña cancelada", "info"); onClose(); onDeleted();
    } catch { onToast("Error al cancelar", "error"); }
    finally { setCancelling(false); }
  };

  const del = async () => {
    if (!confirm("¿Eliminar esta campaña del historial?")) return;
    setDeleting(true);
    try {
      await fetch(`${baseUrl}/api/campaigns/${campaignId}`, { method: "DELETE", headers: { "x-api-key": apiKey } });
      onToast("Campaña eliminada", "success"); onClose(); onDeleted();
    } catch { onToast("Error al eliminar", "error"); }
    finally { setDeleting(false); }
  };

  const filteredMsgs = detail?.mensajes.filter(m => msgFilter === "all" || m.estado === msgFilter) ?? [];
  const cfg = detail ? (statusConfig[detail.estado] ?? statusConfig.pendiente) : statusConfig.pendiente;
  const fecha = detail?.created_at || detail?.creado_en || "";

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        className="w-full max-w-2xl relative flex flex-col h-full"
        style={{ background: "#050805", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.05] flex justify-between items-start shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            {loading ? (
              <div className="h-5 w-40 bg-white/[0.05] rounded animate-pulse" />
            ) : (
              <>
                <h3 className="text-base font-black text-white truncate">{detail?.nombre}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  {fecha && (
                    <>
                      <span className="text-[10px] text-white/40 font-mono">{fmtDateShort(fecha)}</span>
                      <span className="text-[10px] text-[#4ade80]/70 font-mono font-bold">{fmtTime(fecha)}</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <button onClick={onClose}
            className="bg-white/[0.05] text-white/40 hover:text-white p-2 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.05) transparent" }}>
          {loading ? (
            <div className="space-y-3">
              {[80,60,100,40].map((w,i) => (
                <div key={i} className="h-3 bg-white/[0.04] rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : detail ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: "Total",      v: detail.total_mensajes, c: "#9ca3af" },
                  { l: "Enviados",   v: detail.enviados,       c: "#4ade80" },
                  { l: "Fallidos",   v: detail.fallidos,       c: "#f87171" },
                  { l: "Pendientes", v: detail.pendientes,     c: "#60a5fa" },
                ].map(({ l, v, c }) => (
                  <div key={l} className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                    <p className="text-xl font-black leading-none" style={{ color: c }}>{v}</p>
                    <p className="text-[8px] text-white/40 uppercase tracking-wider mt-0.5 font-bold">{l}</p>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="bg-white/[0.03] rounded-xl p-3">
                <div className="flex justify-between text-[10px] mb-2">
                  <span className="text-white/50">Progreso total</span>
                  <span className="font-bold" style={{ color: cfg.color }}>{detail.porcentaje_completado}%</span>
                </div>
                <ProgressBar pct={detail.porcentaje_completado} color={cfg.color} />
                <div className="flex justify-between mt-2 text-[9px] font-mono">
                  <span className="text-white/30">Delay: {(detail.delay_ms / 1000).toFixed(1)}s</span>
                  <span className="text-white/20">ID: {detail.id}</span>
                </div>
              </div>

              {/* Messages list */}
              <div>
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-white/60">
                    Mensajes ({filteredMsgs.length})
                  </span>
                  <div className="flex gap-1">
                    {(["all","enviado","fallido","pendiente"] as const).map(f => (
                      <button key={f} onClick={() => setMsgFilter(f)}
                        className={`text-[9px] font-bold px-2 py-1 rounded transition-all ${
                          msgFilter === f ? "bg-[#4ade80]/10 text-[#4ade80]" : "text-white/30 hover:text-white/60"}`}>
                        {f === "all" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {filteredMsgs.length === 0 ? (
                    <div className="py-8 text-center text-white/20 text-xs">Sin mensajes en esta categoría</div>
                  ) : filteredMsgs.map((m, i) => {
                    const mc = msgStatusConfig[m.estado] ?? msgStatusConfig.pendiente;
                    const isOpen = expanded === m.id;
                    return (
                      <motion.div key={m.id ?? i} layout
                        className="bg-white/[0.03] rounded-xl overflow-hidden cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : m.id)}>

                        {/* Row */}
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          {/* Estado dot */}
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: mc.color }} />

                          {/* Teléfono */}
                          <span className="text-[11px] font-mono text-[#4ade80] shrink-0 w-28">
                            +{m.telefono}
                          </span>

                          {/* Texto preview */}
                          <span className={`text-[11px] flex-1 transition-all ${isOpen ? "text-white/70" : "text-white/40 truncate"}`}>
                            {m.texto || "—"}
                          </span>

                          {/* Tipo + Estado */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[8px] text-white/25 uppercase hidden sm:block">{m.tipo}</span>
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                              style={{ background: mc.bg, color: mc.color }}>{m.estado}</span>
                          </div>
                        </div>

                        {/* Expanded */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                              className="overflow-hidden">
                              <div className="px-3 pb-3 space-y-2 border-t border-white/[0.04] pt-2.5">
                                {/* Mensaje completo */}
                                {m.texto && (
                                  <div>
                                    <p className="text-[8px] font-bold uppercase tracking-widest text-white/30 mb-1 flex items-center gap-1">
                                      <MessageSquare className="w-2.5 h-2.5" /> Mensaje completo
                                    </p>
                                    <p className="text-xs text-white/70 leading-relaxed bg-black/20 rounded-lg px-3 py-2">
                                      {m.texto}
                                    </p>
                                  </div>
                                )}
                                {/* Error */}
                                {m.error && (
                                  <div className="bg-red-500/[0.07] rounded-lg px-3 py-2">
                                    <p className="text-[8px] font-bold uppercase tracking-widest text-red-400/60 mb-0.5">Error</p>
                                    <p className="text-xs text-red-400">{m.error}</p>
                                  </div>
                                )}
                                {/* Meta */}
                                <div className="flex gap-4 text-[9px] font-mono text-white/25">
                                  <span>Tipo: <span className="text-white/45">{m.tipo}</span></span>
                                  <span>ID: <span className="text-white/45">{m.id}</span></span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        {detail && (
          <div className="px-4 py-3 border-t border-white/[0.05] flex gap-2 shrink-0">
            {detail.estado === "en_proceso" && (
              <button onClick={cancel} disabled={cancelling}
                className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2
                           bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/15
                           disabled:opacity-40 transition-all">
                {cancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                {cancelling ? "Cancelando..." : "⏸ Cancelar campaña"}
              </button>
            )}
            <button onClick={del} disabled={deleting}
              className="py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2
                         bg-white/[0.04] hover:bg-white/[0.07] text-white/50 hover:text-white/80
                         disabled:opacity-40 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CampaignsView({ baseUrl, apiKey, onToast }: CampaignsViewProps) {
  const [campaigns,  setCampaigns]  = useState<Campaign[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState<"all"|"en_proceso"|"completada"|"completada_con_errores"|"cancelada"|"error">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/campaigns`, { headers: { "x-api-key": apiKey } });
      const d = await r.json();
      setCampaigns(d.datos?.campañas || []);
    } catch { onToast("Error cargando campañas", "error"); }
    finally { setLoading(false); }
  }, [baseUrl]);

  useEffect(() => { load(); }, [load]);

  const filtered = campaigns.filter(c => {
    const estadoMatch = filter === "all" || c.estado === filter;
    const searchMatch = c.nombre.toLowerCase().includes(search.toLowerCase());
    return estadoMatch && searchMatch;
  });

  const total      = campaigns.length;
  const completadas = campaigns.filter(c => c.estado === "completada").length;
  const activas    = campaigns.filter(c => c.estado === "en_proceso").length;
  const totalSent  = campaigns.reduce((a, c) => a + c.enviados, 0);
  const totalMsgs  = campaigns.reduce((a, c) => a + c.total_mensajes, 0);

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { l: "Campañas",      v: total,                      c: "text-white" },
          { l: "Activas",       v: activas,                    c: "text-[#60a5fa]" },
          { l: "Completadas",   v: completadas,                c: "text-[#4ade80]" },
          { l: "Msgs enviados", v: totalSent.toLocaleString(), c: "text-[#4ade80]" },
          { l: "Msgs totales",  v: totalMsgs.toLocaleString(), c: "text-white/50" },
        ].map(({ l, v, c }) => (
          <div key={l} className="bg-[#040704] rounded-xl px-3 py-2.5">
            <p className="text-[8px] font-bold uppercase tracking-widest text-white/40 mb-0.5">{l}</p>
            <p className={`text-lg font-black leading-none ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {campaigns.length > 0 && <Last5DaysChart campaigns={campaigns} />}

      {/* Toolbar */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-0.5 bg-[#040704] rounded-lg p-1">
          {([["all","Todas"],["en_proceso","Activas"],["completada","Completadas"],["completada_con_errores","Con errores"],["cancelada","Canceladas"],["error","Error"]] as const)
            .map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all
                  ${filter === f ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>
                {label}
              </button>
            ))}
        </div>

        <div className="flex-1 min-w-36 relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar campaña..."
            className="w-full bg-[#040704] rounded-lg py-2 pl-7 pr-3 text-xs text-white
                       focus:outline-none placeholder:text-white/20" />
        </div>

        <button onClick={load}
          className="flex items-center gap-1.5 bg-[#040704] text-white/40 hover:text-white/70
                     px-3 py-2 rounded-lg text-xs font-bold transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Grid */}
      {loading && campaigns.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="bg-[#040704] rounded-xl p-3 h-40 space-y-2.5">
              {[60,40,80,40].map((w,j) => (
                <div key={j} className="h-2.5 bg-white/[0.04] rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <BarChart3 className="w-10 h-10 text-white/10" />
          <p className="text-xs text-white/25">No se encontraron campañas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <AnimatePresence>
            {filtered.map(c => (
              <CampaignCard key={c.id} c={c} onClick={() => setSelectedId(c.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Drawer */}
      <AnimatePresence>
        {selectedId && (
          <DetailDrawer key={selectedId} campaignId={selectedId} baseUrl={baseUrl} apiKey={apiKey}
            onClose={() => setSelectedId(null)} onToast={onToast}
            onDeleted={() => { setSelectedId(null); load(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
