import React, { useState, useRef } from "react";
import axios from "axios";
import { Send, RefreshCw, FileText, Image as ImageIcon, X, CheckCircle2, Phone, AlignLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type MsgType = "texto" | "imagen" | "documento";

interface UploadedFile { url: string; originalname: string; mimetype: string; }
interface SendResult { ok: boolean; phone: string; messageId?: string; error?: string; }
interface SendViewProps {
  connected: boolean; baseUrl: string; apiKey: string;
  onToast: (message: string, type: "success" | "error" | "info") => void;
}

const TYPE_OPTIONS: { value: MsgType; label: string; Icon: React.ElementType }[] = [
  { value: "texto",     label: "Texto",     Icon: AlignLeft  },
  { value: "imagen",    label: "Imagen",    Icon: ImageIcon  },
  { value: "documento", label: "Documento", Icon: FileText   },
];

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ msgType, uploaded, uploading, progress, onFile, onRemove }: {
  msgType: "imagen" | "documento"; uploaded: UploadedFile | null;
  uploading: boolean; progress: number; onFile: (f: File) => void; onRemove: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const accept = msgType === "imagen" ? "image/*" : ".pdf,.doc,.docx,.xls,.xlsx,.zip,.mp4,.mp3";
  const hint   = msgType === "imagen" ? "JPG, PNG, GIF, WEBP — máx 50MB" : "PDF, Word, Excel, ZIP, MP4 — máx 50MB";

  if (uploaded) return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#25D366]/[0.08] border border-[#25D366]/20 rounded-xl p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#25D366]/15 flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-4 h-4 text-[#25D366]" />
      </div>
      <p className="text-xs font-medium text-white/80 flex-1 truncate">{uploaded.originalname}</p>
      <button type="button" onClick={onRemove}
        className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );

  if (uploading) return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-3.5 h-3.5 text-[#25D366] animate-spin" />
        <span className="text-xs text-white/50">Subiendo...</span>
        <span className="ml-auto text-[10px] font-mono text-[#25D366]">{progress}%</span>
      </div>
      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full bg-[#25D366]"
          animate={{ width: `${progress}%` }} transition={{ duration: 0.15 }} />
      </div>
    </div>
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-all
        ${isDragging
          ? "border-[#25D366]/50 bg-[#25D366]/[0.06]"
          : "border-white/[0.07] hover:border-[#25D366]/30 hover:bg-[#25D366]/[0.03] bg-white/[0.02]"}`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
        ${isDragging ? "bg-[#25D366]/15" : "bg-white/[0.04]"}`}>
        {msgType === "imagen"
          ? <ImageIcon className={`w-5 h-5 ${isDragging ? "text-[#25D366]" : "text-white/25"}`} />
          : <FileText  className={`w-5 h-5 ${isDragging ? "text-[#25D366]" : "text-white/25"}`} />}
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-white/50">Arrastra o haz clic para subir</p>
        <p className="text-[10px] text-white/25 mt-0.5">{hint}</p>
      </div>
    </div>
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: SendResult }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      {result.ok ? (
        <div className="bg-[#25D366]/[0.08] border border-[#25D366]/20 rounded-xl p-3.5 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#25D366]/15 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#25D366]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#25D366]">Mensaje enviado</p>
            <p className="text-[10px] text-white/40 mt-0.5">Para: +{result.phone}</p>
            {result.messageId && <p className="text-[9px] font-mono text-white/20 mt-0.5">ID: {result.messageId}</p>}
          </div>
        </div>
      ) : (
        <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl p-3.5">
          <p className="text-xs font-bold text-red-400">{result.error}</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SendView({ connected, baseUrl, apiKey, onToast }: SendViewProps) {
  const [msgType,     setMsgType]     = useState<MsgType>("texto");
  const [countryCode, setCountryCode] = useState("51");
  const [phone,       setPhone]       = useState("");
  const [text,        setText]        = useState("");
  const [uploaded,    setUploaded]    = useState<UploadedFile | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [isSending,   setIsSending]   = useState(false);
  const [result,      setResult]      = useState<SendResult | null>(null);

  const handleTypeChange = (t: MsgType) => { setMsgType(t); setUploaded(null); setResult(null); };

  const handleFile = (file: File) => {
    setUploading(true); setProgress(0); setUploaded(null);
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${baseUrl}/api/upload`);
    xhr.setRequestHeader("x-api-key", apiKey);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      setUploading(false);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && data.exito) { setUploaded(data.datos); onToast("Archivo subido", "success"); }
        else onToast(data.error ?? "Error al subir", "error");
      } catch { onToast("Respuesta inválida", "error"); }
    };
    xhr.onerror = () => { setUploading(false); onToast("Error de red", "error"); };
    xhr.send(formData);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault(); setResult(null);
    const phoneTrimmed = phone.trim();
    if (!phoneTrimmed)                       return onToast("Ingresa un número", "error");
    if (msgType === "texto" && !text.trim()) return onToast("Escribe un mensaje", "error");
    if (msgType !== "texto" && !uploaded)    return onToast("Primero sube el archivo", "error");
    const cleanPhone = phoneTrimmed.replace(/[\s\-+]/g, "");
    const fullPhone  = cleanPhone.startsWith(countryCode) ? cleanPhone : `${countryCode}${cleanPhone}`;
    setIsSending(true);
    const body: Record<string, string> = { phone: fullPhone, type: msgType };
    if (text.trim()) body.text = text.trim();
    if (uploaded) { body.file_url = uploaded.url; body.filename = uploaded.originalname; body.mime_type = uploaded.mimetype; }
    try {
      const { data } = await axios.post(`${baseUrl}/api/send/single`, body, { headers: { "x-api-key": apiKey } });
      if (data.exito) {
        setResult({ ok: true, phone: fullPhone, messageId: data.datos?.message_id });
        onToast("¡Mensaje enviado!", "success");
        setPhone(""); setText(""); setUploaded(null);
      } else { setResult({ ok: false, phone: fullPhone, error: data.error }); onToast(data.error, "error"); }
    } catch (err: any) {
      const msg = err.response?.data?.error ?? "Error de conexión";
      setResult({ ok: false, phone: fullPhone, error: msg }); onToast(msg, "error");
    } finally { setIsSending(false); }
  };

  const isDisabled = isSending || !connected || uploading;

  return (
    <div className="max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#040704] rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#25D366]/15 flex items-center justify-center">
            <Send className="w-4 h-4 text-[#25D366]" />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-white  uppercase">Enviar Mensaje</h3>
          </div>
        </div>

        <form onSubmit={handleSend} className="p-5 space-y-4">

          {/* Tipo */}
          <div className="flex gap-1 bg-black/20 rounded-xl p-1">
            {TYPE_OPTIONS.map(({ value, label, Icon }) => (
              <button key={value} type="button" onClick={() => handleTypeChange(value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all
                  ${msgType === value
                    ? "bg-[#25D366] text-black shadow-sm"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"}`}>
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <label className="text-[8px] font-bold uppercase tracking-widest text-gray-200 flex items-center gap-1.5">
              <Phone className="w-2.5 h-2.5" />
              Número de Teléfono
            </label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 bg-black/20 border border-white/[0.06] rounded-xl px-3 focus-within:border-[#25D366]/30 transition-all">
                <span className="text-white/30 text-xs">+</span>
                <input type="text" value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ""))}
                  className="bg-transparent text-white text-xs w-8 outline-none py-2.5" maxLength={4} placeholder="51" />
              </div>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="987 654 321"
                className="flex-1 bg-black/20 border border-white/[0.06] rounded-xl py-2.5 px-3.5 text-xs text-white
                           focus:border-[#25D366]/40 focus:ring-1 focus:ring-[#25D366]/15 outline-none transition-all placeholder:text-white/20" />
            </div>
          
          </div>

          {/* Archivo */}
          <AnimatePresence>
            {msgType !== "texto" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 overflow-hidden">
                <label className="text-[8px] font-bold uppercase tracking-widest text-white/50 block">
                  {msgType === "imagen" ? "Imagen" : "Documento"}
                </label>
                <DropZone msgType={msgType} uploaded={uploaded} uploading={uploading}
                  progress={progress} onFile={handleFile} onRemove={() => setUploaded(null)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mensaje */}
          <div className="space-y-1.5">
            <label className="text-[8px] font-bold uppercase tracking-widest text-gray-200 block">
              {msgType === "texto" ? "Mensaje" : "Caption (opcional)"}
            </label>
            <div className="relative">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
                placeholder={msgType === "texto" ? "Escribe tu mensaje aquí..." : "Texto junto al archivo..."}
                className="w-full bg-black/20 border border-white/[0.06] rounded-xl p-3.5 text-xs text-white
                           focus:border-[#25D366]/40 focus:ring-1 focus:ring-[#25D366]/15 outline-none transition-all
                           resize-none placeholder:text-white/20 leading-relaxed" />
              <span className="absolute bottom-2.5 right-3 text-[9px] text-white/20 font-mono">{text.length}</span>
            </div>
          </div>

          <AnimatePresence>{result && <ResultCard result={result} />}</AnimatePresence>

          <button type="submit" disabled={isDisabled}
            className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all
              ${isDisabled
                ? "bg-white/[0.05] text-white/20 cursor-not-allowed"
                : "bg-[#25D366] text-black hover:bg-[#20ba59] active:scale-[0.98] shadow-sm"}`}>
            {isSending
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Enviando...</>
              : <><Send className="w-3.5 h-3.5" />Enviar Mensaje</>}
          </button>

          {!connected && (
            <p className="text-center text-[10px] text-red-400/60">Conecta WhatsApp primero</p>
          )}
        </form>
      </motion.div>
    </div>
  );
}
