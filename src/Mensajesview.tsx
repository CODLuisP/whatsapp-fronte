import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle, Search, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, Image, FileText, AlignLeft, X, Phone,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Mensaje {
  id: string;
  campaign_id: string | null;
  telefono: string;
  texto: string | null;
  tipo: "texto" | "imagen" | "documento";
  archivo_url: string | null;
  estado: "enviado" | "fallido" | "pendiente";
  error_detalle: string | null;
  intentos: number;
  enviado_en: string | null;
  created_at: string;
}

interface ApiResponse {
  total: number;
  pagina: number;
  total_paginas: number;
  por_pagina: number;
  mensajes: Mensaje[];
}

interface MensajesViewProps {
  baseUrl: string;
  apiKey: string;
  onToast: (message: string, type: "success" | "error" | "info") => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const estadoConfig = {
  enviado:   { label: "Enviado",   color: "#4ade80", bg: "#4ade8015", Icon: CheckCircle2 },
  fallido:   { label: "Fallido",   color: "#f87171", bg: "#f8717115", Icon: XCircle      },
  pendiente: { label: "Pendiente", color: "#60a5fa", bg: "#60a5fa15", Icon: Clock        },
};

const tipoConfig = {
  texto:     { label: "Texto",     Icon: AlignLeft  },
  imagen:    { label: "Imagen",    Icon: Image      },
  documento: { label: "Doc",       Icon: FileText   },
};

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

// ── StatChip ─────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#040704] rounded-xl px-3 py-2.5">
      <p className="text-[8px] font-bold uppercase tracking-widest text-white/40 mb-0.5">{label}</p>
      <p className={`text-lg font-black leading-none ${color}`}>{value}</p>
    </div>
  );
}

// ── MessageRow ────────────────────────────────────────────────────────────────

function MessageRow({ m, onClick, isOpen }: { m: Mensaje; onClick: () => void; isOpen: boolean }) {
  const est  = estadoConfig[m.estado] ?? estadoConfig.pendiente;
  const tipo = tipoConfig[m.tipo]     ?? tipoConfig.texto;

  return (
    <motion.div layout className="bg-[#040704] rounded-xl overflow-hidden cursor-pointer hover:bg-[#060a06] transition-colors"
      onClick={onClick}>
      {/* Row principal */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Estado dot */}
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: est.color }} />

        {/* Teléfono */}
        <div className="flex items-center gap-1 shrink-0 w-32">
          <Phone className="w-2.5 h-2.5 text-white/25" />
          <span className="text-[11px] font-mono text-[#4ade80]">+{m.telefono}</span>
        </div>

        {/* Tipo icono */}
        <div className="shrink-0 hidden sm:flex items-center gap-1 w-16">
          <tipo.Icon className="w-3 h-3 text-white/30" />
          <span className="text-[9px] text-white/30 uppercase tracking-wider">{tipo.label}</span>
        </div>

        {/* Texto preview */}
        <span className={`text-[11px] flex-1 min-w-0 transition-all ${isOpen ? "text-white/70 whitespace-normal" : "text-white/40 truncate"}`}>
          {m.texto || (m.tipo !== "texto" ? `[${tipo.label}]` : "—")}
        </span>

        {/* Estado badge */}
        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded shrink-0 flex items-center gap-1"
          style={{ background: est.bg, color: est.color }}>
          <span className="w-1 h-1 rounded-full" style={{ background: est.color }} />
          {est.label}
        </span>

        {/* Fecha */}
        <span className="text-[9px] text-white/25 font-mono hidden lg:block shrink-0 w-36 text-right">
          {fmtDate(m.enviado_en || m.created_at)}
        </span>
      </div>

      {/* Detalle expandido */}
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/[0.04]">
            <div className="px-4 pb-3 pt-2.5 space-y-2.5">

              {/* Mensaje completo */}
              {m.texto && (
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-white/30 mb-1">Mensaje</p>
                  <p className="text-xs text-white/70 leading-relaxed bg-black/20 rounded-lg px-3 py-2">{m.texto}</p>
                </div>
              )}

              {/* Archivo */}
              {m.archivo_url && (
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-white/30 mb-1">Archivo</p>
                  <p className="text-xs text-[#60a5fa] break-all bg-black/20 rounded-lg px-3 py-2">{m.archivo_url}</p>
                </div>
              )}

              {/* Error */}
              {m.error_detalle && (
                <div className="bg-red-500/[0.07] rounded-lg px-3 py-2">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-red-400/60 mb-0.5">Error</p>
                  <p className="text-xs text-red-400">{m.error_detalle}</p>
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[9px] font-mono text-white/25">
                <span>Tipo: <span className="text-white/45">{m.tipo}</span></span>
                <span>Intentos: <span className="text-white/45">{m.intentos}</span></span>
                {m.campaign_id && <span>Campaña: <span className="text-white/45">{m.campaign_id}</span></span>}
                <span>Creado: <span className="text-white/45">{fmtDate(m.created_at)}</span></span>
                {m.enviado_en && <span>Enviado: <span className="text-[#4ade80]/70">{fmtDate(m.enviado_en)}</span></span>}
                <span>ID: <span className="text-white/35">{m.id}</span></span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#040704] text-white/40 hover:text-white disabled:opacity-25 transition-all">
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-white/20 text-xs">…</span>
        ) : (
          <button key={p} onClick={() => onPage(p as number)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all
              ${page === p ? "bg-[#4ade80]/15 text-[#4ade80]" : "bg-[#040704] text-white/40 hover:text-white/70"}`}>
            {p}
          </button>
        )
      )}

      <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#040704] text-white/40 hover:text-white disabled:opacity-25 transition-all">
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export default function MensajesView({ baseUrl, apiKey, onToast }: MensajesViewProps) {
  const [data,       setData]       = useState<ApiResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<"" | "enviado" | "fallido" | "pendiente">("");
  const [filterTipo,   setFilterTipo]   = useState<"" | "texto" | "imagen" | "documento">("");
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const LIMIT = 50;

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (filterEstado) params.set("estado", filterEstado);
      if (filterTipo)   params.set("tipo",   filterTipo);

      const r = await fetch(`${baseUrl}/api/messages?${params}`, { headers: { "x-api-key": apiKey } });
      const json = await r.json();
      if (json.exito) {
        setData(json.datos);
      } else {
        onToast("Error cargando mensajes", "error");
      }
    } catch {
      onToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, apiKey, page, filterEstado, filterTipo]);

  useEffect(() => { load(page); }, [page, filterEstado, filterTipo]);
  useEffect(() => { load(1); setPage(1); }, [debouncedSearch]);

  const handleFilterEstado = (v: typeof filterEstado) => {
    setFilterEstado(v);
    setPage(1);
    setExpandedId(null);
  };
  const handleFilterTipo = (v: typeof filterTipo) => {
    setFilterTipo(v);
    setPage(1);
    setExpandedId(null);
  };

  // Filtro local por teléfono (en los resultados ya paginados)
  const mensajesFiltrados = (data?.mensajes ?? []).filter(m =>
    debouncedSearch === "" || m.telefono.includes(debouncedSearch.replace(/\D/g, ""))
  );

  const enviados  = data?.mensajes.filter(m => m.estado === "enviado").length  ?? 0;
  const fallidos  = data?.mensajes.filter(m => m.estado === "fallido").length  ?? 0;
  const pendientes = data?.mensajes.filter(m => m.estado === "pendiente").length ?? 0;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatChip label="Total mensajes"  value={(data?.total ?? 0).toLocaleString()} color="text-white" />
        <StatChip label="Enviados (pág)"  value={enviados}  color="text-[#4ade80]" />
        <StatChip label="Fallidos (pág)"  value={fallidos}  color="text-[#f87171]" />
        <StatChip label="Pendientes (pág)" value={pendientes} color="text-[#60a5fa]" />
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">

        {/* Filtro estado */}
        <div className="flex gap-0.5 bg-[#040704] rounded-lg p-1">
          {([["", "Todos"], ["enviado", "Enviados"], ["fallido", "Fallidos"], ["pendiente", "Pendientes"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => handleFilterEstado(v)}
              className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all
                ${filterEstado === v ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Filtro tipo */}
        <div className="flex gap-0.5 bg-[#040704] rounded-lg p-1">
          {([["", "Todos"], ["texto", "Texto"], ["imagen", "Imagen"], ["documento", "Doc"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => handleFilterTipo(v)}
              className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all
                ${filterTipo === v ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Búsqueda por teléfono */}
        <div className="flex-1 min-w-36 relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por teléfono..."
            className="w-full bg-[#040704] rounded-lg py-2 pl-7 pr-7 text-xs text-white focus:outline-none placeholder:text-white/20"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Refresh */}
        <button onClick={() => load(page)}
          className="flex items-center gap-1.5 bg-[#040704] text-white/40 hover:text-white/70 px-3 py-2 rounded-lg text-xs font-bold transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Info paginación */}
      {data && (
        <div className="flex items-center justify-between text-[10px] text-white/25 font-mono px-0.5">
          <span>
            {data.total.toLocaleString()} mensajes en total
            {(filterEstado || filterTipo) && " (filtrado)"}
          </span>
          <span>Página {data.pagina} de {data.total_paginas}</span>
        </div>
      )}

      {/* Lista */}
      {loading && !data ? (
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#040704] rounded-xl h-11 animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      ) : mensajesFiltrados.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <MessageCircle className="w-10 h-10 text-white/10" />
          <p className="text-xs text-white/25">
            {data?.total === 0 ? "Aún no hay mensajes" : "Sin resultados para este filtro"}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence initial={false}>
            {mensajesFiltrados.map(m => (
              <MessageRow
                key={m.id}
                m={m}
                isOpen={expandedId === m.id}
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Paginación */}
      {data && (
        <Pagination
          page={data.pagina}
          totalPages={data.total_paginas}
          onPage={(p) => { setPage(p); setExpandedId(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      )}
    </div>
  );
}
