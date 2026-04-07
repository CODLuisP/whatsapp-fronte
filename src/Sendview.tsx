import React, { useState, useRef } from "react";
import axios from "axios";
import {
  Send,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  X,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MsgType = "texto" | "imagen" | "documento";

interface UploadedFile {
  url: string;
  originalname: string;
  mimetype: string;
}

interface SendResult {
  ok: boolean;
  phone: string;
  messageId?: string;
  error?: string;
}

interface SendViewProps {
  connected: boolean;
  baseUrl: string;
  apiKey: string;
  onToast: (message: string, type: "success" | "error" | "info") => void;
}

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({
  msgType,
  uploaded,
  uploading,
  progress,
  onFile,
  onRemove,
}: {
  msgType: "imagen" | "documento";
  uploaded: UploadedFile | null;
  uploading: boolean;
  progress: number;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = msgType === "imagen"
    ? "image/*"
    : ".pdf,.doc,.docx,.xls,.xlsx,.zip,.mp4,.mp3";
  const hint = msgType === "imagen"
    ? "JPG, PNG, GIF, WEBP — máx 50MB"
    : "PDF, Word, Excel, ZIP, MP4 — máx 50MB";

  if (uploaded) {
    return (
      <div className="border border-[#25D366]/30 bg-[#25D366]/5 rounded-xl p-4 flex items-center gap-3">
        <div className="p-2 bg-[#25D366]/10 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-[#25D366]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{uploaded.originalname}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Subido correctamente</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-500 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (uploading) {
    return (
      <div className="border border-white/10 bg-white/5 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-[#25D366] animate-spin" />
          <span className="text-sm text-gray-400">Subiendo archivo...</span>
          <span className="ml-auto text-xs font-mono text-[#25D366]">{progress}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#25D366] transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
        ${isDragging ? "border-[#25D366] bg-[#25D366]/5" : "border-white/10 hover:border-white/20 bg-white/5"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      {msgType === "imagen"
        ? <ImageIcon className="w-8 h-8 text-gray-500" />
        : <FileText  className="w-8 h-8 text-gray-500" />}
      <div className="text-center">
        <p className="text-sm font-medium text-white">Arrastra o haz click para subir</p>
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      </div>
    </div>
  );
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: SendResult }) {
  if (result.ok) {
    return (
      <div className="bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl p-4 space-y-1">
        <p className="text-sm font-bold text-[#25D366]">✓ Mensaje enviado</p>
        <p className="text-xs text-gray-400">Para: +{result.phone}</p>
        {result.messageId && (
          <p className="text-[10px] font-mono text-gray-500">ID: {result.messageId}</p>
        )}
      </div>
    );
  }
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
      <p className="text-sm font-bold text-red-400">✗ {result.error}</p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SendView({ connected, baseUrl, apiKey, onToast }: SendViewProps) {
  const [msgType,   setMsgType]   = useState<MsgType>("texto");
  const [countryCode, setCountryCode] = useState("51");
  const [phone,     setPhone]     = useState("");
  const [text,      setText]      = useState("");
  const [uploaded,  setUploaded]  = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [result,    setResult]    = useState<SendResult | null>(null);

  // ── Cambiar tipo ──────────────────────────────────────────────────────────
  const handleTypeChange = (t: MsgType) => {
    setMsgType(t);
    setUploaded(null);
    setResult(null);
  };

  // ── Upload via XHR (progress real) ───────────────────────────────────────
  const handleFile = (file: File) => {
    setUploading(true);
    setProgress(0);
    setUploaded(null);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${baseUrl}/api/upload`);
    xhr.setRequestHeader("x-api-key", apiKey);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setUploading(false);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && data.exito) {
          setUploaded(data.datos);
          onToast("Archivo subido correctamente", "success");
        } else {
          onToast(data.error ?? "Error al subir archivo", "error");
        }
      } catch {
        onToast("Respuesta inválida del servidor", "error");
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      onToast("Error de red al subir archivo", "error");
    };

    xhr.send(formData);
  };

  // ── Enviar ────────────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    const phoneTrimmed = phone.trim();
    if (!phoneTrimmed)                         return onToast("Ingresa un número de teléfono", "error");
    if (msgType === "texto" && !text.trim())   return onToast("Escribe un mensaje", "error");
    if (msgType !== "texto" && !uploaded)      return onToast("Primero sube el archivo", "error");

    // ── Construir número completo igual que el vanilla: "51" + "987654321"
    // Limpiamos espacios, guiones y el símbolo + por si el usuario los escribe
    const cleanPhone = phoneTrimmed.replace(/[\s\-+]/g, "");
    // Si ya empieza con el código de país, no lo duplicamos
    const fullPhone = cleanPhone.startsWith(countryCode)
      ? cleanPhone
      : `${countryCode}${cleanPhone}`;

    setIsSending(true);

    // Body exacto que espera el servidor (mismo que app.js vanilla)
    const body: Record<string, string> = {
      phone: fullPhone,
      type:  msgType,
    };
    if (text.trim()) body.text = text.trim();
    if (uploaded) {
      body.file_url  = uploaded.url;
      body.filename  = uploaded.originalname;
      body.mime_type = uploaded.mimetype;
    }

    try {
      const { data } = await axios.post(`${baseUrl}/api/send/single`, body, {
        headers: { "x-api-key": apiKey }
      });

      if (data.exito) {
        setResult({ ok: true, phone: fullPhone, messageId: data.datos?.message_id });
        onToast("¡Mensaje enviado!", "success");
        setPhone("");
        setText("");
        setUploaded(null);
      } else {
        setResult({ ok: false, phone: fullPhone, error: data.error });
        onToast(data.error, "error");
      }
    } catch (err: any) {
      const msg = err.response?.data?.error ?? "Error de conexión con la API";
      setResult({ ok: false, phone: fullPhone, error: msg });
      onToast(msg, "error");
    } finally {
      setIsSending(false);
    }
  };

  const isDisabled = isSending || !connected || uploading;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <h3 className="text-xl font-bold text-white">Enviar Mensaje</h3>
          <p className="text-sm text-gray-400 mt-1">Envío individual a cualquier número</p>
        </div>

        <form onSubmit={handleSend} className="p-6 space-y-6">

          {/* Tipo de mensaje */}
          <div className="flex p-1 bg-white/5 rounded-xl gap-1">
            {(["texto", "imagen", "documento"] as MsgType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all
                  ${msgType === t
                    ? "bg-[#25D366] text-black shadow-[0_0_15px_rgba(37,211,102,0.3)]"
                    : "text-gray-500 hover:text-white"}`}
              >
                {t === "texto" ? "Texto" : t === "imagen" ? "Imagen" : "Documento"}
              </button>
            ))}
          </div>

          {/* Teléfono */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">
              Número de Teléfono
            </label>
            <div className="flex gap-2">
              {/* Código de país editable */}
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 ">
                <span className="text-gray-500 text-sm">+</span>
                <input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ""))}
                  className="bg-transparent text-white text-sm w-10 outline-none"
                  maxLength={4}
                  placeholder="51"
                />
              </div>
              {/* Número local */}
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="987 654 321"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all"
              />
            </div>
            <p className="text-[10px] text-gray-600 mt-1.5">
              Se enviará a: <span className="text-gray-400 font-mono">
                +{countryCode}{phone.trim().replace(/[\s\-+]/g, "") || "..."}
              </span>
            </p>
          </div>

          {/* Archivo */}
          {msgType !== "texto" && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">
                {msgType === "imagen" ? "Imagen" : "Documento"}
              </label>
              <DropZone
                msgType={msgType}
                uploaded={uploaded}
                uploading={uploading}
                progress={progress}
                onFile={handleFile}
                onRemove={() => setUploaded(null)}
              />
            </div>
          )}

          {/* Texto / Caption */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">
              {msgType === "texto" ? "Mensaje" : "Caption (opcional)"}
            </label>
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder={
                  msgType === "texto"
                    ? "Escribe tu mensaje aquí..."
                    : "Texto que aparece junto al archivo..."
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] outline-none transition-all resize-none"
              />
              <div className="absolute bottom-3 right-3 text-[10px] text-gray-500 font-mono">
                {text.length} caracteres
              </div>
            </div>
          </div>

          {/* Resultado */}
          {result && <ResultCard result={result} />}

          {/* Botón */}
          <button
            type="submit"
            disabled={isDisabled}
            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all
              ${isDisabled
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-[#25D366] text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_20px_rgba(37,211,102,0.2)]"}`}
          >
            {isSending
              ? <><RefreshCw className="w-5 h-5 animate-spin" /> Enviando...</>
              : <><Send className="w-5 h-5" /> Enviar Mensaje</>}
          </button>

          {!connected && (
            <p className="text-center text-xs text-red-500">
              Conecta WhatsApp primero para enviar mensajes
            </p>
          )}

        </form>
      </div>
    </div>
  );
}