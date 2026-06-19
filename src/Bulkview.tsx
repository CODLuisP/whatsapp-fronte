import { useState, useEffect, useRef } from "react";
import { RefreshCw, Users, CheckCircle2, X } from "lucide-react";
import { motion } from "motion/react";

const API = `${import.meta.env.VITE_API_BASE_URL}/api`;

interface UploadedFile { url: string; originalname: string; mimetype: string; }
interface Recipient { phone: string; text?: string; nombre?: string; [key: string]: string | undefined; }
interface ProgressData { enviados: number; fallidos: number; pendientes: number; porcentaje: number; }
interface EventItem { time: string; cls: string; text: string; }
interface MasivoSectionProps {
  socket: any; isConnected: boolean; apiKey: string;
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}

const fileIcon = (m?: string) =>
  m?.startsWith("image/") ? "🖼️" : m === "application/pdf" ? "📕" :
  m?.includes("word") ? "📝" : m?.includes("excel") || m?.includes("spreadsheet") ? "📊" :
  m?.startsWith("video/") ? "🎬" : m?.startsWith("audio/") ? "🎵" : "📄";

const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ accept, hint, uploadedFile, apiKey, onUpload, onRemove }: {
  accept: string; hint: string; uploadedFile: UploadedFile | null; apiKey: string;
  onUpload: (f: UploadedFile) => void; onRemove: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileSize, setFileSize] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileSize(fmtSize(file.size));
    setUploading(true); setProgress(0);
    const fd = new FormData(); fd.append("file", file);
    try {
      await new Promise<void>((res, rej) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API}/upload`);
        xhr.setRequestHeader("x-api-key", apiKey);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round(e.loaded/e.total*100)); };
        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            if (data.exito) { onUpload(data.datos); res(); } else rej(new Error(data.error));
          } else rej(new Error("HTTP "+xhr.status));
        };
        xhr.onerror = () => rej(new Error("Error de red"));
        xhr.send(fd);
      });
    } catch(e) { console.error(e); } finally { setUploading(false); }
  };

  if (uploadedFile) return (
    <div className="bg-[#4ade80]/[0.06] rounded-lg p-2.5 flex items-center gap-2.5">
      <span className="text-lg shrink-0">{fileIcon(uploadedFile.mimetype)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{uploadedFile.originalname}</p>
        <p className="text-[9px] text-white/30">{fileSize}</p>
      </div>
      <button onClick={onRemove} className="text-white/25 hover:text-red-400 transition-colors shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if(f) handleFile(f); }}
        className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all flex flex-col items-center gap-2
          ${drag ? "border-[#4ade80]/40 bg-[#4ade80]/[0.04]" : "border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]"}`}>
        <input ref={ref} type="file" accept={accept} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if(f) handleFile(f); }} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-white/25">
          <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
        </svg>
        <p className="text-xs font-medium text-white/60">Haz clic o arrastra el archivo</p>
        <p className="text-[9px] text-white/30">{hint}</p>
      </div>
      {uploading && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-[#4ade80] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[9px] text-[#4ade80] font-mono">{progress}%</span>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MasivoSection({ socket, isConnected, apiKey, onToast }: MasivoSectionProps) {
  const [campaignName, setCampaignName]   = useState("");
  const [bulkType, setBulkType]           = useState<"texto"|"imagen"|"documento">("texto");
  const [uploadedFile, setUploadedFile]   = useState<UploadedFile|null>(null);
  const [delay, setDelay]                 = useState(3000);
  const [jsonRaw, setJsonRaw]             = useState("");
  const [jsonStatus, setJsonStatus]       = useState<{msg:string;ok:boolean}|null>(null);
  const [contactCount, setContactCount]   = useState(0);
  const [launching, setLaunching]         = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string|null>(null);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [progress, setProgress]           = useState<ProgressData>({enviados:0,fallidos:0,pendientes:0,porcentaje:0});
  const [statTotal, setStatTotal]         = useState(0);
  const [eventLog, setEventLog]           = useState<EventItem[]>([]);
  const [showProgress, setShowProgress]   = useState(false);
  const [campaignDone, setCampaignDone]   = useState(false);
  const [cancelling, setCancelling]       = useState(false);
  const [isRunning, setIsRunning]         = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const activeCampaignIdRef = useRef<string|null>(null);
  activeCampaignIdRef.current = activeCampaignId;

  useEffect(() => {
    if (!socket) return;
    const handler = (data: any) => {
      const currentId = activeCampaignIdRef.current;
      if (currentId && data.campaign_id !== currentId) return;
      const p: ProgressData = data.progreso;
      if (p) setProgress(p);
      const time = new Date().toLocaleTimeString("es-PE", {hour12:false});
      let cls = "", text = "";
      if (data.evento === "mensaje_enviado")         { cls="sent";   text=`✓ ${data.telefono}`; }
      else if (data.evento === "mensaje_fallido")    { cls="failed"; text=`✗ ${data.telefono} — ${data.error||"error"}`; }
      else if (data.evento === "campaña_completada") {
        text="Campaña completada"; setCampaignDone(true); setIsRunning(false);
        onToast("¡Campaña completada!", "success");
      }
      if (text) setEventLog(prev => [{time,cls,text},...prev].slice(0,200));
    };
    socket.on("progreso_campaña", handler);
    return () => socket.off("progreso_campaña", handler);
  }, [socket]);

  useEffect(() => {
    const raw = jsonRaw.trim();
    if (!raw) { setContactCount(0); return; }
    try { const p=JSON.parse(raw); setContactCount(Array.isArray(p)?p.length:0); }
    catch { setContactCount(0); }
  }, [jsonRaw]);

  const validateJSON = () => {
    try {
      const parsed = JSON.parse(jsonRaw.trim());
      if (!Array.isArray(parsed)||parsed.length===0) throw new Error("Debe ser un array no vacío");
      const errs: string[] = [];
      parsed.forEach((m:any,i:number) => {
        if (!m.phone) errs.push(`Msg ${i+1}: falta "phone"`);
        if (!m.text)  errs.push(`Msg ${i+1}: falta "text"`);
      });
      if (errs.length) setJsonStatus({msg:"✗ "+errs[0],ok:false});
      else setJsonStatus({msg:`✓ JSON válido — ${parsed.length} mensajes`,ok:true});
    } catch(e:any) { setJsonStatus({msg:"✗ JSON inválido: "+e.message,ok:false}); }
  };

  const loadExample = () => {
    setJsonRaw(JSON.stringify([
      {phone:"51987654321",text:"Hola {nombre}, oferta especial 🎉",nombre:"Juan"},
      {phone:"51912345678",text:"Hola {nombre}, oferta especial 🎉",nombre:"María"},
    ],null,2));
    setJsonStatus(null);
  };

  const enviarMasivo = async () => {
    if (!campaignName.trim()) { onToast("Escribe el nombre de la campaña","error"); return; }
    if (!jsonRaw.trim())      { onToast("Agrega al menos un mensaje","error"); return; }
    if (bulkType!=="texto"&&!uploadedFile) { onToast("Primero sube el archivo","error"); return; }
    let messages: Recipient[];
    try { messages=JSON.parse(jsonRaw); if (!Array.isArray(messages)||!messages.length) throw new Error(); }
    catch { onToast("JSON inválido","error"); return; }
    if (bulkType!=="texto"&&uploadedFile)
      messages=messages.map(m=>({...m,type:bulkType,file_url:uploadedFile.url,filename:uploadedFile.originalname,mime_type:uploadedFile.mimetype}));
    setIsRunning(true); setLaunching(true);
    setCampaignTitle(campaignName);
    setProgress({enviados:0,fallidos:0,pendientes:messages.length,porcentaje:0});
    setStatTotal(messages.length); setEventLog([]); setShowProgress(true); setCampaignDone(false);
    try {
      const res=await fetch(`${API}/send/bulk`,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey},
        body:JSON.stringify({campaign_name:campaignName,messages,delay_ms:delay})});
      const data=await res.json();
      if (data.exito) {
        const cid:string=data.datos.campaign_id;
        setActiveCampaignId(cid);
        if (socket) socket.emit("suscribir_campaña",cid);
        onToast(`Campaña "${campaignName}" iniciada`,"success");
      } else {
        onToast(data.error||"Error al iniciar","error");
        setIsRunning(false); setShowProgress(false); setCampaignTitle("");
      }
    } catch { onToast("Error de conexión","error"); setIsRunning(false); setShowProgress(false); setCampaignTitle(""); }
    finally { setLaunching(false); }
  };

  const cancelarCampaña = async () => {
    if (!activeCampaignId) return;
    if (!confirm("¿Cancelar la campaña en curso?")) return;
    setCancelling(true);
    try {
      const res=await fetch(`${API}/campaigns/${activeCampaignId}/cancel`,{method:"POST",headers:{"x-api-key":apiKey}});
      const data=await res.json();
      if (data.exito||res.ok) {
        setCampaignDone(true); setIsRunning(false); setActiveCampaignId(null);
        onToast("Campaña cancelada","info");
        const time=new Date().toLocaleTimeString("es-PE",{hour12:false});
        setEventLog(prev=>[{time,cls:"",text:"Campaña cancelada por el usuario"},...prev]);
      } else onToast(data.error||"Error al cancelar","error");
    } catch { onToast("Error de conexión","error"); }
    finally { setCancelling(false); }
  };

  const TYPE_OPTS: [string, string, string][] = [
    ["texto",    "Solo texto",    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
    ["imagen",   "Con imagen",   "M3 3h18v18H3zM8.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21"],
    ["documento","Con documento","M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"],
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── FORMULARIO ── */}
      <div className="bg-[#040704] rounded-xl p-4 space-y-3">

        {/* Header */}
        <div className="pb-3 border-b border-white/[0.05]">
          <p className="text-[8px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Envío masivo</p>
          <h3 className="text-sm font-black text-white">Configurar Campaña</h3>
        </div>

        {/* Nombre */}
        <div>
          <label className="text-[8px] font-bold uppercase tracking-widest text-white/70 mb-1.5 block">Nombre de la campaña</label>
          <input className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg py-2 px-3 text-xs text-white
                           focus:border-[#4ade80]/40 outline-none transition-all placeholder:text-white/20"
            value={campaignName} onChange={e=>setCampaignName(e.target.value)} placeholder="Promo Abril 2024"/>
        </div>

        {/* Tipo */}
        <div>
          <label className="text-[8px] font-bold uppercase tracking-widest text-white/70 mb-1.5 block">
            Tipo de mensaje
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {TYPE_OPTS.map(([t,label,d])=>(
              <button key={t} type="button"
                onClick={()=>{setBulkType(t as any);setUploadedFile(null);}}
                className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg text-[10px] font-bold transition-all
                  ${bulkType===t
                    ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20"
                    : "bg-white/[0.03] text-white/40 border border-white/[0.05] hover:text-white/60"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                  <path d={d}/>
                </svg>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Archivo */}
        {bulkType!=="texto" && (
          <div>
            <label className="text-[8px] font-bold uppercase tracking-widest text-white/70 mb-1.5 block">Archivo</label>
            <DropZone
              accept={bulkType==="imagen"?"image/*":".pdf,.doc,.docx,.xls,.xlsx,.zip,.mp4,.mp3"}
              hint={bulkType==="imagen"?"JPG, PNG, GIF, WEBP — máx 50MB":"PDF, Word, Excel, ZIP, MP4 — máx 50MB"}
              uploadedFile={uploadedFile} apiKey={apiKey}
              onUpload={f=>{setUploadedFile(f);onToast("Archivo subido","success");}}
              onRemove={()=>setUploadedFile(null)}
            />
          </div>
        )}

        {/* Delay */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[8px] font-bold uppercase tracking-widest text-white/70">Delay entre mensajes</label>
            <span className="text-xs font-bold text-[#4ade80]">{(delay/1000).toFixed(1)}s</span>
          </div>
          <input type="range" min={1000} max={10000} step={500} value={delay}
            onChange={e=>setDelay(+e.target.value)}
            className="w-full accent-[#4ade80] cursor-pointer" />
          <p className="text-[9px] text-white/30 mt-1">Mínimo recomendado: 2s para evitar bloqueos</p>
        </div>

        {/* JSON */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[8px] font-bold uppercase tracking-widest text-white/70 flex items-center gap-2">
              Lista de contactos
              <span className="bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 text-[8px] px-1.5 py-0.5 rounded font-bold">JSON</span>
            </label>
            <div className="flex gap-1.5">
              <button onClick={loadExample}
                className="text-[9px] font-bold text-white/40 hover:text-white/70 px-2.5 py-1 rounded border border-white/[0.06] hover:border-white/[0.12] transition-all">
                Ejemplo
              </button>
              <button onClick={validateJSON}
                className="text-[9px] font-bold text-white/40 hover:text-white/70 px-2.5 py-1 rounded border border-white/[0.06] hover:border-white/[0.12] transition-all">
                Validar
              </button>
            </div>
          </div>
          <textarea
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg p-3 text-[11px] font-mono text-[#4ade80]
                       focus:border-[#4ade80]/40 outline-none transition-all resize-y placeholder:text-white/15"
            style={{ minHeight: 120 }}
            value={jsonRaw}
            onChange={e=>{setJsonRaw(e.target.value);setJsonStatus(null);}}
            placeholder={`[\n  { "phone": "51987654321", "text": "Hola {nombre}!", "nombre": "Juan" }\n]`}
          />
          {jsonStatus && (
            <p className={`text-[10px] mt-1.5 font-mono ${jsonStatus.ok ? "text-[#4ade80]" : "text-red-400"}`}>
              {jsonStatus.msg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 pt-1">
          <div className="bg-white/[0.04] rounded-lg px-3 py-2 text-center shrink-0">
            <p className="text-base font-black text-white leading-none">{contactCount}</p>
            <p className="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">contactos</p>
          </div>
          {isRunning ? (
            <button onClick={cancelarCampaña} disabled={cancelling}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2
                         bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/15
                         disabled:opacity-40 transition-all">
              {cancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
              )}
              {cancelling ? "Cancelando..." : "Cancelar campaña"}
            </button>
          ) : (
            <button onClick={enviarMasivo} disabled={launching||!isConnected}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2
                         bg-[#4ade80] text-black hover:bg-[#4ade80]/90 active:scale-[0.98]
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {launching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
              {launching ? "Iniciando..." : "Iniciar campaña"}
            </button>
          )}
        </div>
      </div>

      {/* ── PROGRESO ── */}
      <div className="bg-[#040704] rounded-xl p-4 flex flex-col">
        <div className="pb-3 border-b border-white/[0.05] mb-3">
          <p className="text-[8px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Tiempo real</p>
          <h3 className="text-sm font-black text-white">Progreso</h3>
        </div>

        {!showProgress ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-white/10">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <p className="text-[11px] text-white/25 text-center">Inicia una campaña para ver el progreso</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3">
            <p className="text-xs font-bold text-white truncate">{campaignTitle}</p>

            {/* Porcentaje + barra */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-2xl font-black text-[#4ade80] leading-none">{progress.porcentaje}%</span>
                <span className="text-[9px] text-white/30 font-mono">{progress.enviados}/{statTotal}</span>
              </div>
              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div animate={{ width: `${progress.porcentaje}%` }} transition={{ duration: 0.5 }}
                  className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#4ade80,#16a34a)" }} />
              </div>
            </div>

            {/* Stats 2x2 */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { l: "Enviados",  v: progress.enviados,  c: "#4ade80" },
                { l: "Fallidos",  v: progress.fallidos,  c: "#f87171" },
                { l: "Pendientes",v: progress.pendientes, c: "#fbbf24" },
                { l: "Total",     v: statTotal,           c: "#60a5fa" },
              ].map(({ l, v, c }) => (
                <div key={l} className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                  <p className="text-lg font-black leading-none" style={{ color: c }}>{v}</p>
                  <p className="text-[8px] text-white/30 uppercase tracking-wider mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            {/* Event log */}
            <div className="bg-white/[0.03] rounded-lg overflow-hidden flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="px-3 py-2 border-b border-white/[0.04]">
                <span className="text-[8px] font-bold uppercase tracking-widest text-white/30">Eventos</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-44" ref={logRef}
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.05) transparent" }}>
                {eventLog.length===0 ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-white/20">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "2s" }} />
                    <span className="text-[10px]">Esperando...</span>
                  </div>
                ) : eventLog.map((e,i)=>(
                  <div key={i} className={`flex items-center gap-2.5 px-3 py-1.5 text-[10px] font-mono border-b border-white/[0.03]
                    ${e.cls==="sent"?"text-[#4ade80]":e.cls==="failed"?"text-red-400":"text-white/40"}`}>
                    <span className="text-white/20 shrink-0 text-[9px]">{e.time}</span>
                    <span className="truncate">{e.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {campaignDone && (
              <div className="flex items-center gap-2 bg-[#4ade80]/[0.07] rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                <p className="text-[10px] text-[#4ade80]/80 font-medium">Completada — revisa Campañas</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
