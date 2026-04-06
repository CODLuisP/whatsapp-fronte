import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart3, Search, X, RefreshCw, Trash2 } from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────
interface MessageDetail {
  id: string;
  telefono: string;
  texto: string;
  tipo: string;
  estado: "enviado" | "fallido" | "pendiente";
  error?: string;
}

interface Campaign {
  id: string;
  nombre: string;
  estado: "en_progreso" | "completada" | "cancelada" | "error" | "pendiente";
  total_mensajes: number;
  enviados: number;
  fallidos: number;
  pendientes: number;
  porcentaje_completado: number;
  delay_ms: number;
  created_at: string;
  creado_en?: string;
}

interface CampaignDetail extends Campaign {
  mensajes: MessageDetail[];
}

interface CampaignsViewProps {
  baseUrl: string;
  onToast: (message: string, type: "success" | "error" | "info") => void;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────
const statusConfig = {
  completada:  { label: "Completada",  color: "#25D366", bg: "#25D36615", dot: "#25D366" },
  en_progreso: { label: "En progreso", color: "#58a6ff", bg: "#58a6ff15", dot: "#58a6ff" },
  cancelada:   { label: "Cancelada",   color: "#e3b341", bg: "#e3b34115", dot: "#e3b341" },
  error:       { label: "Error",       color: "#f85149", bg: "#f8514915", dot: "#f85149" },
  pendiente:   { label: "Pendiente",   color: "#8b949e", bg: "#8b949e15", dot: "#8b949e" },
};

const msgStatusConfig = {
  enviado:   { color: "#25D366", bg: "#25D36615" },
  fallido:   { color: "#f85149", bg: "#f8514915" },
  pendiente: { color: "#58a6ff", bg: "#58a6ff15" },
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });



// ─── STAT CARD ────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: "#0d1117", border: `1px solid ${color}25`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: "#8b949e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ─── PROGRESS BAR ────────────────────────────────────────────────────────
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: "#ffffff08", borderRadius: 4, overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ height: "100%", background: color, borderRadius: 4 }}
      />
    </div>
  );
}

// ─── CAMPAIGN CARD ───────────────────────────────────────────────────────
function CampaignCard({ c, onClick }: { c: Campaign; onClick: () => void }) {
  const cfg = statusConfig[c.estado] ?? statusConfig.pendiente;
  const pct = c.porcentaje_completado ?? 0;
  const fecha = c.created_at || c.creado_en || "";

  return (
    <motion.div
      layoutId={`card-${c.id}`}
      whileHover={{ y: -2 }}
      onClick={onClick}
      style={{
        background: "#111", border: "1px solid #ffffff08", borderRadius: 14,
        padding: 20, cursor: "pointer", transition: "border-color 0.2s",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#ffffff18")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#ffffff08")}
    >
      {/* Glow accent */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle, ${cfg.color}12 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#e6edf3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</div>
          <div style={{ fontSize: 10, color: "#444", marginTop: 3, fontFamily: "monospace" }}>{fecha ? fmtDate(fecha) : "—"}</div>
        </div>
        <div style={{
          background: cfg.bg, color: cfg.color, fontSize: 9, fontWeight: 800,
          padding: "3px 8px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.08em",
          whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, display: "inline-block", boxShadow: c.estado === "en_progreso" ? `0 0 6px ${cfg.dot}` : "none" }} />
          {cfg.label}
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
          <span style={{ color: "#8b949e" }}>Progreso</span>
          <span style={{ color: cfg.color, fontWeight: 700 }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} color={cfg.color} />
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
        {[
          { l: "Enviados", v: c.enviados, c: "#25D366" },
          { l: "Fallidos", v: c.fallidos, c: "#f85149" },
          { l: "Total", v: c.total_mensajes, c: "#8b949e" },
        ].map(({ l, v, c: col }) => (
          <div key={l} style={{ textAlign: "center", background: "#0d1117", borderRadius: 7, padding: "7px 4px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: col }}>{v}</div>
            <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{l}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── DETAIL DRAWER ───────────────────────────────────────────────────────
function DetailDrawer({
  campaignId, baseUrl, onClose, onToast, onDeleted,
}: {
  campaignId: string;
  baseUrl: string;
  onClose: () => void;
  onToast: (m: string, t: "success" | "error" | "info") => void;
  onDeleted: () => void;
}) {
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msgFilter, setMsgFilter] = useState<"all" | "enviado" | "fallido" | "pendiente">("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${baseUrl}/api/campaigns/${campaignId}`);
        const d = await r.json();
        const raw = d.datos;
        setDetail({ ...raw.campaña, mensajes: raw.mensajes || [] });
      } catch {
        onToast("Error cargando detalle", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [campaignId]);

  const cancel = async () => {
    setCancelling(true);
    try {
      await fetch(`${baseUrl}/api/campaigns/${campaignId}/cancel`, { method: "POST" });
      onToast("Campaña cancelada", "info");
      onClose();
      onDeleted();
    } catch {
      onToast("Error al cancelar", "error");
    } finally {
      setCancelling(false);
    }
  };

  const del = async () => {
    if (!confirm("¿Eliminar esta campaña del historial?")) return;
    setDeleting(true);
    try {
      await fetch(`${baseUrl}/api/campaigns/${campaignId}`, { method: "DELETE" });
      onToast("Campaña eliminada", "success");
      onClose();
      onDeleted();
    } catch {
      onToast("Error al eliminar", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filteredMsgs = detail?.mensajes.filter(m => msgFilter === "all" || m.estado === msgFilter) ?? [];
  const cfg = detail ? (statusConfig[detail.estado] ?? statusConfig.pendiente) : statusConfig.pendiente;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        style={{
          width: "100%", maxWidth: 640, background: "#111", borderLeft: "1px solid #ffffff10",
          height: "100%", position: "relative", display: "flex", flexDirection: "column",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #ffffff08", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
            {loading ? (
              <div style={{ height: 22, width: 200, background: "#ffffff08", borderRadius: 6, marginBottom: 8 }} />
            ) : (
              <>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#e6edf3", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail?.nombre}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <div style={{ background: cfg.bg, color: cfg.color, fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {cfg.label}
                  </div>
                  <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>{detail?.created_at ? fmtDate(detail.created_at) : ""}</span>
                </div>
              </>
            )}
          </div>
          <button onClick={onClose}
            style={{ background: "#ffffff08", border: "none", color: "#8b949e", padding: 8, borderRadius: 9, cursor: "pointer", display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[80, 60, 100, 40].map((w, i) => (
                <div key={i} style={{ height: 14, width: `${w}%`, background: "#ffffff06", borderRadius: 6 }} />
              ))}
            </div>
          ) : detail ? (
            <>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24 }}>
                <StatCard label="Total" value={detail.total_mensajes} color="#8b949e" />
                <StatCard label="Enviados" value={detail.enviados} color="#25D366" />
                <StatCard label="Fallidos" value={detail.fallidos} color="#f85149" />
                <StatCard label="Pendientes" value={detail.pendientes} color="#58a6ff" />
              </div>

              {/* Progress */}
              <div style={{ background: "#0d1117", border: "1px solid #ffffff08", borderRadius: 10, padding: "14px 16px", marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#8b949e" }}>Progreso total</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{detail.porcentaje_completado}%</span>
                </div>
                <ProgressBar pct={detail.porcentaje_completado} color={cfg.color} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "#444" }}>
                  <span>Delay: {(detail.delay_ms / 1000).toFixed(1)}s entre mensajes</span>
                  <span>ID: {detail.id}</span>
                </div>
              </div>

              {/* Messages table */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#8b949e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Mensajes ({filteredMsgs.length})
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["all", "enviado", "fallido", "pendiente"] as const).map(f => (
                      <button key={f} onClick={() => setMsgFilter(f)}
                        style={{
                          background: msgFilter === f ? "#25D36615" : "#0d1117",
                          border: `1px solid ${msgFilter === f ? "#25D36640" : "#30363d"}`,
                          color: msgFilter === f ? "#25D366" : "#555",
                          padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                          fontSize: 10, fontWeight: 700, fontFamily: "inherit",
                        }}>
                        {f === "all" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: "#0d1117", border: "1px solid #ffffff08", borderRadius: 10, overflow: "hidden", maxHeight: 360, overflowY: "auto" }}>
                  {filteredMsgs.length === 0 ? (
                    <div style={{ padding: "32px 0", textAlign: "center", color: "#333", fontSize: 13 }}>Sin mensajes en esta categoría</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #ffffff08", background: "#0a0a0a", position: "sticky", top: 0 }}>
                          {["Teléfono", "Texto", "Tipo", "Estado", "Error"].map(h => (
                            <th key={h} style={{ padding: "9px 12px", textAlign: "left", color: "#444", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMsgs.map((m, i) => {
                          const mc = msgStatusConfig[m.estado] ?? msgStatusConfig.pendiente;
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid #ffffff04" }}>
                              <td style={{ padding: "8px 12px", color: "#25D366", fontFamily: "monospace", whiteSpace: "nowrap" }}>+{m.telefono}</td>
                              <td style={{ padding: "8px 12px", color: "#8b949e", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.texto || "—"}</td>
                              <td style={{ padding: "8px 12px", color: "#555" }}>{m.tipo}</td>
                              <td style={{ padding: "8px 12px" }}>
                                <span style={{ background: mc.bg, color: mc.color, fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, textTransform: "uppercase" }}>
                                  {m.estado}
                                </span>
                              </td>
                              <td style={{ padding: "8px 12px", color: "#f85149", fontSize: 11, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.error || ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer actions */}
        {detail && (
          <div style={{ padding: "16px 28px", borderTop: "1px solid #ffffff08", display: "flex", gap: 10 }}>
            {detail.estado === "en_progreso" && (
              <button onClick={cancel} disabled={cancelling}
                style={{
                  flex: 1, background: "#f8514910", border: "1px solid #f8514930", color: "#f85149",
                  padding: "11px 0", borderRadius: 9, cursor: cancelling ? "not-allowed" : "pointer",
                  fontWeight: 700, fontSize: 13, fontFamily: "inherit", opacity: cancelling ? 0.5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                {cancelling ? "Cancelando..." : "⏸ Cancelar campaña"}
              </button>
            )}
            <button onClick={del} disabled={deleting}
              style={{
                background: "#ffffff08", border: "1px solid #ffffff10", color: "#8b949e",
                padding: "11px 16px", borderRadius: 9, cursor: deleting ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: 13, fontFamily: "inherit", opacity: deleting ? 0.5 : 1,
                display: "flex", alignItems: "center", gap: 6,
              }}>
              <Trash2 size={14} />
              {deleting ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────
export default function CampaignsView({ baseUrl, onToast }: CampaignsViewProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "en_progreso" | "completada" | "cancelada" | "error">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/campaigns`);
      const d = await r.json();
      setCampaigns(d.datos?.campañas || []);
    } catch {
      onToast("Error cargando campañas", "error");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => { load(); }, [load]);

  const filtered = campaigns.filter(c => {
    const matchFilter = filter === "all" || c.estado === filter;
    const matchSearch = c.nombre.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Summary stats
  const total = campaigns.length;
  const completadas = campaigns.filter(c => c.estado === "completada").length;
  const activas = campaigns.filter(c => c.estado === "en_progreso").length;
  const totalMsgs = campaigns.reduce((a, c) => a + c.total_mensajes, 0);
  const totalSent = campaigns.reduce((a, c) => a + c.enviados, 0);

  return (
    <>
      <style>{`
        .cview-scroll::-webkit-scrollbar { width: 4px; }
        .cview-scroll::-webkit-scrollbar-track { background: transparent; }
        .cview-scroll::-webkit-scrollbar-thumb { background: #ffffff10; border-radius: 4px; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── SUMMARY STRIP ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
          {[
            { l: "Campañas", v: total, c: "#e6edf3" },
            { l: "Activas", v: activas, c: "#58a6ff" },
            { l: "Completadas", v: completadas, c: "#25D366" },
            { l: "Mensajes enviados", v: totalSent.toLocaleString(), c: "#25D366" },
            { l: "Mensajes totales", v: totalMsgs.toLocaleString(), c: "#8b949e" },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ background: "#111", border: "1px solid #ffffff08", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 9, color: "#444", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {/* Filter pills */}
          <div style={{ display: "flex", gap: 4, background: "#111", border: "1px solid #ffffff08", borderRadius: 10, padding: 4 }}>
            {([
              ["all", "Todas"],
              ["en_progreso", "Activas"],
              ["completada", "Completadas"],
              ["cancelada", "Canceladas"],
              ["error", "Error"],
            ] as const).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? "#ffffff12" : "none",
                  border: "none", color: filter === f ? "#e6edf3" : "#555",
                  padding: "6px 14px", borderRadius: 7, cursor: "pointer",
                  fontSize: 11, fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: 160, position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#444" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar campaña..."
              style={{
                width: "100%", background: "#111", border: "1px solid #ffffff08", borderRadius: 9,
                padding: "8px 10px 8px 30px", color: "#e6edf3", fontSize: 13, fontFamily: "inherit", outline: "none",
              }} />
          </div>

          {/* Refresh */}
          <button onClick={load}
            style={{
              background: "#111", border: "1px solid #ffffff08", color: "#555",
              padding: "8px 14px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
            }}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
            Actualizar
          </button>
        </div>

        {/* ── GRID ── */}
        {loading && campaigns.length === 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: "#111", border: "1px solid #ffffff08", borderRadius: 14, padding: 20, height: 180 }}>
                {[60, 40, 80, 40].map((w, j) => (
                  <div key={j} style={{ height: 12, width: `${w}%`, background: "#ffffff06", borderRadius: 6, marginBottom: 10 }} />
                ))}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#333" }}>
            <BarChart3 size={40} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
            <div style={{ fontSize: 14 }}>No se encontraron campañas</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
            <AnimatePresence>
              {filtered.map(c => (
                <CampaignCard key={c.id} c={c} onClick={() => setSelectedId(c.id)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── DRAWER ── */}
      <AnimatePresence>
        {selectedId && (
          <DetailDrawer
            key={selectedId}
            campaignId={selectedId}
            baseUrl={baseUrl}
            onClose={() => setSelectedId(null)}
            onToast={onToast}
            onDeleted={() => { setSelectedId(null); load(); }}
          />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}