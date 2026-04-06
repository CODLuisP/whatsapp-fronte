import { useState, useEffect, useRef } from "react";

const API = "http://localhost:3000/api";

interface UploadedFile { url: string; originalname: string; mimetype: string; }
interface Recipient { phone: string; text?: string; nombre?: string; [key: string]: string | undefined; }
interface ProgressData { enviados: number; fallidos: number; pendientes: number; porcentaje: number; }
interface EventItem { time: string; cls: string; text: string; }
interface MasivoSectionProps {
  socket: any;
  isConnected: boolean;
  onToast: (msg: string, type: "success" | "error" | "info") => void;
}

const fileIcon = (m?: string) =>
  m?.startsWith("image/") ? "🖼️" : m === "application/pdf" ? "📕" :
  m?.includes("word") ? "📝" : m?.includes("excel") || m?.includes("spreadsheet") ? "📊" :
  m?.startsWith("video/") ? "🎬" : m?.startsWith("audio/") ? "🎵" : "📄";

const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

function DropZone({ accept, hint, uploadedFile, onUpload, onRemove }: {
  accept: string; hint: string; uploadedFile: UploadedFile | null;
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

  return (
    <div className="dropzone-wrap">
      <div className={`dropzone ${drag?"drag-over":""}`}
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f) handleFile(f); }}>
        <input ref={ref} type="file" accept={accept} className="hidden-input"
          onChange={(e) => { const f=e.target.files?.[0]; if(f) handleFile(f); }} />
        {!uploadedFile ? (
          <div className="dropzone-idle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            <p>Haz clic o arrastra el archivo aquí</p><span>{hint}</span>
          </div>
        ) : (
          <div className="dropzone-preview">
            <span className="file-icon">{fileIcon(uploadedFile.mimetype)}</span>
            <div className="file-info">
              <div className="file-name">{uploadedFile.originalname}</div>
              <div className="file-size">{fileSize}</div>
            </div>
            <button className="btn-remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}>✕</button>
          </div>
        )}
      </div>
      {uploading && (
        <div className="upload-progress-wrap">
          <div className="upload-bar"><div className="upload-fill" style={{width:`${progress}%`}}/></div>
          <span className="upload-pct">{progress}%</span>
        </div>
      )}
      {uploadedFile && !uploading && (
        <div className="uploaded-url">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{uploadedFile.originalname} ✓</span>
        </div>
      )}
    </div>
  );
}

export default function MasivoSection({ socket, isConnected, onToast }: MasivoSectionProps) {
  const [campaignName, setCampaignName] = useState("");
  const [bulkType, setBulkType] = useState<"texto"|"imagen"|"documento">("texto");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile|null>(null);
  const [delay, setDelay] = useState(3000);
  const [jsonRaw, setJsonRaw] = useState("");
  const [jsonStatus, setJsonStatus] = useState<{msg:string;ok:boolean}|null>(null);
  const [contactCount, setContactCount] = useState(0);
  const [launching, setLaunching] = useState(false);

  const [activeCampaignId, setActiveCampaignId] = useState<string|null>(null);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [progress, setProgress] = useState<ProgressData>({enviados:0,fallidos:0,pendientes:0,porcentaje:0});
  const [statTotal, setStatTotal] = useState(0);
  const [eventLog, setEventLog] = useState<EventItem[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const [campaignDone, setCampaignDone] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
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
        text="🏁 Campaña completada";
        setCampaignDone(true);
        // ← AQUI: cuando la campaña termina sola, apagamos isRunning
        setIsRunning(false);
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
        if (!m.phone) errs.push(`Mensaje ${i+1}: falta "phone"`);
        if (!m.text)  errs.push(`Mensaje ${i+1}: falta "text"`);
      });
      if (errs.length) setJsonStatus({msg:"✗ "+errs[0],ok:false});
      else setJsonStatus({msg:`✓ JSON válido — ${parsed.length} mensajes listos`,ok:true});
    } catch(e:any) { setJsonStatus({msg:"✗ JSON inválido: "+e.message,ok:false}); }
  };

  const loadExample = () => {
    setJsonRaw(JSON.stringify([
      {phone:"51987654321",text:"Hola {nombre}, tenemos una oferta especial 🎉",nombre:"Juan"},
      {phone:"51912345678",text:"Hola {nombre}, tenemos una oferta especial 🎉",nombre:"María"},
      {phone:"51955555555",text:"Hola {nombre}, tenemos una oferta especial 🎉",nombre:"Carlos"},
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

    if (bulkType!=="texto"&&uploadedFile) {
      messages=messages.map(m=>({...m,type:bulkType,file_url:uploadedFile.url,filename:uploadedFile.originalname,mime_type:uploadedFile.mimetype}));
    }

    // ── FIX PRINCIPAL: activar isRunning ANTES del fetch ──
    // Así el botón cancelar aparece inmediatamente al hacer click,
    // sin esperar la respuesta de la API.
    setIsRunning(true);
    setLaunching(true);
    setCampaignTitle(campaignName);
    setProgress({enviados:0,fallidos:0,pendientes:messages.length,porcentaje:0});
    setStatTotal(messages.length);
    setEventLog([]);
    setShowProgress(true);
    setCampaignDone(false);

    try {
      const res=await fetch(`${API}/send/bulk`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({campaign_name:campaignName,messages,delay_ms:delay})});
      const data=await res.json();

      if (data.exito) {
        const cid:string=data.datos.campaign_id;
        setActiveCampaignId(cid);
        if (socket) socket.emit("suscribir_campaña",cid);
        onToast(`Campaña "${campaignName}" iniciada`,"success");
      } else {
        // Si la API falla, revertimos todo
        onToast(data.error||"Error al iniciar","error");
        setIsRunning(false);
        setShowProgress(false);
        setCampaignTitle("");
      }
    } catch {
      onToast("Error de conexión","error");
      // Si hay error de red, también revertimos
      setIsRunning(false);
      setShowProgress(false);
      setCampaignTitle("");
    } finally {
      setLaunching(false);
    }
  };

  const cancelarCampaña = async () => {
    if (!activeCampaignId) return;
    if (!confirm("¿Cancelar la campaña en curso?")) return;
    setCancelling(true);
    try {
      const res=await fetch(`${API}/campaigns/${activeCampaignId}/cancel`,{method:"POST"});
      const data=await res.json();
      if (data.exito||res.ok) {
        setCampaignDone(true);
        setIsRunning(false);
        setActiveCampaignId(null);
        onToast("Campaña cancelada","info");
        const time=new Date().toLocaleTimeString("es-PE",{hour12:false});
        setEventLog(prev=>[{time,cls:"",text:"⏸ Campaña cancelada por el usuario"},...prev]);
      } else { onToast(data.error||"Error al cancelar","error"); }
    } catch { onToast("Error de conexión","error"); }
    finally { setCancelling(false); }
  };

  return (
    <>
      <style>{`
        .masivo-layout{display:grid;grid-template-columns:1fr 360px;gap:20px}
        @media(max-width:900px){.masivo-layout{grid-template-columns:1fr}}
        .m-card{background:var(--surface,#161b22);border:1px solid var(--border,#30363d);border-radius:12px;padding:22px}
        .m-group{margin-bottom:20px}
        .m-label{display:block;font-size:13px;font-weight:500;color:var(--text,#e6edf3);margin-bottom:8px}
        .m-input{width:100%;background:var(--input-bg,#0d1117);border:1px solid var(--border,#30363d);border-radius:8px;padding:10px 13px;color:var(--text,#e6edf3);font-size:14px;font-family:inherit;outline:none;transition:border-color 0.2s}
        .m-input:focus{border-color:#25D366}
        .m-textarea{resize:vertical;min-height:180px;font-family:'DM Mono','Courier New',monospace;font-size:12.5px;line-height:1.6;color:#25D366}
        .type-selector{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .type-btn{background:var(--input-bg,#0d1117);border:1px solid var(--border,#30363d);border-radius:8px;padding:12px 8px;cursor:pointer;color:var(--text3,#8b949e);font-size:12px;font-weight:500;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:5px;font-family:inherit}
        .type-btn:hover{border-color:#25D36660;color:var(--text,#e6edf3)}
        .type-btn.active{background:#25D36612;border-color:#25D366;color:#25D366}
        .type-btn svg{opacity:0.7}.type-btn.active svg{opacity:1}
        .slider-group{display:flex;align-items:center;gap:12px}
        .m-slider{flex:1;accent-color:#25D366;cursor:pointer}
        .slider-val{color:#25D366;font-size:13px;font-weight:600;min-width:38px;text-align:right}
        .field-hint{font-size:11px;color:var(--text3,#8b949e);margin-top:5px}
        .json-toolbar{display:flex;gap:8px;margin-bottom:8px}
        .btn-ghost{background:var(--input-bg,#0d1117);border:1px solid var(--border,#30363d);border-radius:6px;padding:5px 12px;color:var(--text3,#8b949e);font-size:12px;cursor:pointer;font-family:inherit;transition:all 0.2s}
        .btn-ghost:hover{border-color:#25D36660;color:var(--text,#e6edf3)}
        .json-status{font-size:12px;margin-top:6px}
        .json-status.valid{color:#25D366}.json-status.invalid{color:#f85149}
        .form-bottom{display:flex;align-items:center;gap:14px;margin-top:4px}
        .counter-card{background:var(--input-bg,#0d1117);border:1px solid var(--border,#30363d);border-radius:8px;padding:10px 16px;text-align:center;flex-shrink:0;min-width:76px}
        .counter-num{font-size:22px;font-weight:700;color:var(--text,#e6edf3);line-height:1}
        .counter-lbl{font-size:10px;color:var(--text3,#8b949e);margin-top:2px}
        .btn-primary{flex:1;background:#25D366;border:none;border-radius:8px;padding:12px 20px;color:#000;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;transition:opacity 0.2s}
        .btn-primary:hover{opacity:0.9}.btn-primary:disabled{opacity:0.45;cursor:not-allowed}
        .dropzone{border:2px dashed var(--border,#30363d);border-radius:8px;padding:18px 14px;cursor:pointer;transition:all 0.2s}
        .dropzone:hover,.dropzone.drag-over{border-color:#25D366;background:#25D36608}
        .dropzone-idle{display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--text3,#8b949e);text-align:center}
        .dropzone-idle p{font-size:13px;color:var(--text,#e6edf3);margin:0}.dropzone-idle span{font-size:11px}
        .dropzone-preview{display:flex;align-items:center;gap:10px}
        .file-icon{font-size:26px;flex-shrink:0}
        .file-info{flex:1;min-width:0}
        .file-name{font-size:13px;font-weight:500;color:var(--text,#e6edf3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .file-size{font-size:11px;color:var(--text3,#8b949e);margin-top:2px}
        .btn-remove{background:#f8514920;border:none;color:#f85149;padding:5px 8px;border-radius:6px;cursor:pointer;font-weight:700;font-size:12px}
        .hidden-input{display:none}
        .upload-progress-wrap{display:flex;align-items:center;gap:10px;margin-top:8px}
        .upload-bar{flex:1;height:4px;background:#30363d;border-radius:4px;overflow:hidden}
        .upload-fill{height:100%;background:linear-gradient(90deg,#25D366,#128C7E);transition:width 0.2s}
        .upload-pct{font-size:11px;color:#25D366;min-width:32px;text-align:right}
        .uploaded-url{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px;color:#25D366}
        .progress-panel{display:flex;flex-direction:column}
        .panel-label{font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text3,#8b949e);margin-bottom:16px}
        .progress-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--text3,#8b949e);padding:30px 0;text-align:center}
        .progress-empty svg{opacity:0.3}.progress-empty p{font-size:13px;margin:0}
        .progress-content{flex:1;display:flex;flex-direction:column;gap:14px}
        .campaign-title{font-size:14px;font-weight:600;color:var(--text,#e6edf3)}
        .big-percent{font-size:40px;font-weight:700;color:#25D366;line-height:1}
        .prog-bar-wrap{height:5px;background:#30363d;border-radius:4px;overflow:hidden}
        .prog-bar-fill{height:100%;background:linear-gradient(90deg,#25D366,#128C7E);border-radius:4px;transition:width 0.5s ease}
        .progress-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .stat-item{background:var(--input-bg,#0d1117);border:1px solid var(--border,#30363d);border-radius:8px;padding:10px 12px}
        .stat-item.sent{border-color:#25D36630}.stat-item.failed{border-color:#f8514930}
        .stat-item.pending{border-color:#e3b34130}.stat-item.total{border-color:#58a6ff30}
        .stat-num{font-size:20px;font-weight:700}
        .stat-item.sent .stat-num{color:#25D366}.stat-item.failed .stat-num{color:#f85149}
        .stat-item.pending .stat-num{color:#e3b341}.stat-item.total .stat-num{color:#58a6ff}
        .stat-label{font-size:10px;color:var(--text3,#8b949e);margin-top:2px;text-transform:uppercase;letter-spacing:0.06em}
        .event-log{background:var(--input-bg,#0d1117);border:1px solid var(--border,#30363d);border-radius:8px;padding:6px;max-height:180px;overflow-y:auto;flex:1}
        .event-item{padding:4px 8px;font-size:11px;display:flex;gap:8px;align-items:center;border-radius:4px}
        .event-item.sent{color:#25D366}.event-item.failed{color:#f85149}
        .evt-time{color:var(--text3,#8b949e);font-family:monospace;font-size:10px;flex-shrink:0}
        .btn-cancel{width:100%;background:#f8514910;border:1px solid #f8514930;color:#f85149;border-radius:8px;padding:10px 0;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:7px;transition:all 0.2s}
        .btn-cancel:hover{background:#f8514920;border-color:#f8514960}
        .btn-cancel:disabled{opacity:0.4;cursor:not-allowed}
        .btn-cancel-main{flex:1;background:#f8514912;border:1px solid #f8514940;color:#f85149;border-radius:8px;padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;transition:all 0.2s}
        .btn-cancel-main:hover{background:#f8514922;border-color:#f8514970}
        .btn-cancel-main:disabled{opacity:0.4;cursor:not-allowed}
        .done-banner{background:#25D36610;border:1px solid #25D36630;border-radius:8px;padding:10px 14px;font-size:12px;color:#25D366;text-align:center;font-weight:600}
        .badge-opt{background:var(--input-bg,#0d1117);border:1px solid var(--border,#30363d);border-radius:4px;font-size:10px;padding:1px 6px;color:var(--text3,#8b949e);margin-left:6px;font-weight:400}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{display:inline-block;animation:spin 0.8s linear infinite}
      `}</style>

      <div className="masivo-layout">

        {/* ── FORMULARIO ── */}
        <div className="m-card">
          <div className="m-group">
            <label className="m-label">Nombre de la campaña</label>
            <input className="m-input" value={campaignName} onChange={e=>setCampaignName(e.target.value)} placeholder="Promo Abril 2024"/>
          </div>

          <div className="m-group">
            <label className="m-label">Archivo para todos los mensajes<span className="badge-opt">opcional</span></label>
            <div className="type-selector">
              {([
                ["texto","Solo texto","M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
                ["imagen","Con imagen","M3 3h18v18H3zM8.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21"],
                ["documento","Con documento","M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"],
              ] as [string,string,string][]).map(([t,label,d])=>(
                <button key={t} className={`type-btn ${bulkType===t?"active":""}`}
                  onClick={()=>{setBulkType(t as any);setUploadedFile(null);}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d={d}/></svg>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {bulkType!=="texto"&&(
            <div className="m-group">
              <DropZone
                accept={bulkType==="imagen"?"image/*":".pdf,.doc,.docx,.xls,.xlsx,.zip,.mp4,.mp3"}
                hint={bulkType==="imagen"?"JPG, PNG, GIF, WEBP — máx 50MB":"PDF, Word, Excel, ZIP, MP4 — máx 50MB"}
                uploadedFile={uploadedFile}
                onUpload={f=>{setUploadedFile(f);onToast("Archivo subido correctamente","success");}}
                onRemove={()=>setUploadedFile(null)}
              />
            </div>
          )}

          <div className="m-group">
            <label className="m-label">Delay entre mensajes</label>
            <div className="slider-group">
              <input type="range" className="m-slider" min={1000} max={10000} step={500} value={delay} onChange={e=>setDelay(+e.target.value)}/>
              <span className="slider-val">{(delay/1000).toFixed(1)}s</span>
            </div>
            <div className="field-hint">Mínimo recomendado: 2s para evitar bloqueos</div>
          </div>

          <div className="m-group">
            <label className="m-label">
              Lista de contactos
              <span style={{background:"#25D36620",border:"1px solid #25D36640",color:"#25D366",fontSize:10,padding:"1px 7px",borderRadius:4,marginLeft:7,fontWeight:600}}>JSON</span>
            </label>
            <div className="json-toolbar">
              <button className="btn-ghost" onClick={loadExample}>Cargar ejemplo</button>
              <button className="btn-ghost" onClick={validateJSON}>Validar JSON</button>
            </div>
            <textarea className="m-input m-textarea" value={jsonRaw}
              onChange={e=>{setJsonRaw(e.target.value);setJsonStatus(null);}}
              placeholder={`[\n  { "phone": "51987654321", "text": "Hola {nombre}!", "nombre": "Juan" },\n  { "phone": "51912345678", "text": "Hola {nombre}!", "nombre": "María" }\n]`}/>
            {jsonStatus&&<div className={`json-status ${jsonStatus.ok?"valid":"invalid"}`}>{jsonStatus.msg}</div>}
          </div>

          <div className="form-bottom">
            <div className="counter-card">
              <div className="counter-num">{contactCount}</div>
              <div className="counter-lbl">contactos</div>
            </div>
            {isRunning ? (
              <button className="btn-cancel-main" onClick={cancelarCampaña} disabled={cancelling}>
                {cancelling ? <span className="spin">⟳</span> : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                  </svg>
                )}
                {cancelling ? "Cancelando..." : "Cancelar campaña"}
              </button>
            ) : (
              <button className="btn-primary" onClick={enviarMasivo} disabled={launching||!isConnected}>
                {launching?<span className="spin">⟳</span>:(
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                )}
                {launching?"Iniciando...":"Iniciar campaña"}
              </button>
            )}
          </div>
        </div>

        {/* ── PANEL PROGRESO ── */}
        <div className="m-card progress-panel">
          <div className="panel-label">Progreso en tiempo real</div>

          {!showProgress?(
            <div className="progress-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <p>Inicia una campaña para ver el progreso</p>
            </div>
          ):(
            <div className="progress-content">
              <div className="campaign-title">{campaignTitle}</div>
              <div className="big-percent">{progress.porcentaje}%</div>
              <div className="prog-bar-wrap">
                <div className="prog-bar-fill" style={{width:`${progress.porcentaje}%`}}/>
              </div>
              <div className="progress-stats">
                <div className="stat-item sent"><div className="stat-num">{progress.enviados}</div><div className="stat-label">Enviados</div></div>
                <div className="stat-item failed"><div className="stat-num">{progress.fallidos}</div><div className="stat-label">Fallidos</div></div>
                <div className="stat-item pending"><div className="stat-num">{progress.pendientes}</div><div className="stat-label">Pendientes</div></div>
                <div className="stat-item total"><div className="stat-num">{statTotal}</div><div className="stat-label">Total</div></div>
              </div>

              <div className="event-log" ref={logRef}>
                {eventLog.length===0?(
                  <div style={{padding:"16px 0",textAlign:"center",color:"#8b949e",fontSize:12}}>
                    <span className="spin" style={{marginRight:6}}>⟳</span>Esperando eventos...
                  </div>
                ):eventLog.map((e,i)=>(
                  <div key={i} className={`event-item ${e.cls}`}>
                    <span className="evt-time">{e.time}</span>
                    <span>{e.text}</span>
                  </div>
                ))}
              </div>

              {campaignDone && (
                <div className="done-banner">
                  ✓ Campaña finalizada — ve a Campañas para ver el detalle
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </>
  );
}