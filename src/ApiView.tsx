import { useState } from "react";
import { Terminal, Copy, CheckCircle2, Server, Key, User, BookOpen } from "lucide-react";
import { motion } from "motion/react";

interface ApiViewProps { apiKey: string; userName: string; baseUrl: string; }

export default function ApiView({ apiKey, userName, baseUrl }: ApiViewProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const codeExamples = [
    {
      id: "send-text", title: "Enviar mensaje de texto", method: "POST",
      endpoint: "/api/send/single",
      description: "Envía un mensaje de texto simple. El número debe incluir código de país sin el símbolo +.",
      steps: null,
      body: `{\n  "phone": "51987654321",\n  "type": "texto",\n  "text": "Hola, este es un mensaje de prueba."\n}`,
      curl: `curl -X POST ${baseUrl}/api/send/single \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${apiKey}" \\\n  -d '{"phone":"51987654321","type":"texto","text":"Hola!"}'`,
    },
    {
      id: "send-image", title: "Enviar imagen", method: "POST",
      endpoint: "/api/upload  →  /api/send/single",
      description: "Dos pasos: sube la imagen con /api/upload (multipart/form-data, clave file), luego envía con la URL devuelta.",
      steps: ["Sube el archivo con POST /api/upload usando form-data (clave: file). Guarda la url.", "Envía el mensaje con la URL obtenida:"],
      body: `{\n  "phone": "51987654321",\n  "type": "imagen",\n  "file_url": "http://tu-servidor/uploads/imagen.jpg",\n  "text": "Caption opcional"\n}`,
      curl: `# Paso 1 — subir imagen\ncurl -X POST ${baseUrl}/api/upload \\\n  -H "x-api-key: ${apiKey}" \\\n  -F "file=@/ruta/imagen.jpg"\n\n# Paso 2 — enviar imagen\ncurl -X POST ${baseUrl}/api/send/single \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${apiKey}" \\\n  -d '{"phone":"51987654321","type":"imagen","file_url":"http://tu-servidor/uploads/imagen.jpg"}'`,
    },
    {
      id: "send-document", title: "Enviar documento", method: "POST",
      endpoint: "/api/upload  →  /api/send/single",
      description: "Igual que imagen pero con type: documento. Incluye filename y mime_type para que WhatsApp muestre el nombre correcto.",
      steps: ["Sube el archivo con POST /api/upload usando form-data (clave: file).", "Envía el mensaje con la URL, nombre y MIME type:"],
      body: `{\n  "phone": "51987654321",\n  "type": "documento",\n  "file_url": "http://tu-servidor/uploads/factura.pdf",\n  "filename": "Factura_001.pdf",\n  "mime_type": "application/pdf",\n  "text": "Adjuntamos tu factura"\n}`,
      curl: `# Paso 1 — subir documento\ncurl -X POST ${baseUrl}/api/upload \\\n  -H "x-api-key: ${apiKey}" \\\n  -F "file=@/ruta/factura.pdf"\n\n# Paso 2 — enviar documento\ncurl -X POST ${baseUrl}/api/send/single \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${apiKey}" \\\n  -d '{"phone":"51987654321","type":"documento","file_url":"...","filename":"Factura_001.pdf","mime_type":"application/pdf"}'`,
    },
    {
      id: "check-status", title: "Verificar estado de conexión", method: "GET",
      endpoint: "/api/status",
      description: "Obtiene el estado actual de la sesión de WhatsApp vinculada al API Key. No requiere body.",
      steps: null, body: "",
      curl: `curl -X GET ${baseUrl}/api/status \\\n  -H "x-api-key: ${apiKey}"`,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-3 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Credenciales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#040704] rounded-xl p-4">
          <p className="text-[8px] font-bold uppercase tracking-widest text-white/75 mb-3">Credenciales</p>
          <div className="flex items-center gap-2.5 mb-2">
            <User className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-white/75">Usuario</span>
          </div>
          <div className="bg-white/[0.04] rounded-lg px-3 py-2">
            <p className="text-sm font-bold text-white">{userName}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-[#040704] rounded-xl p-4">
          <p className="text-[8px] font-bold uppercase tracking-widest text-white/75 mb-3">API Key</p>
          <div className="flex items-center gap-2.5 mb-2">
            <Key className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-white/75">x-api-key header</span>
          </div>
          <div className="bg-white/[0.04] rounded-lg px-3 py-2 flex items-center justify-between gap-2">
            <p className="text-xs font-mono text-[#4ade80] truncate">{apiKey}</p>
            <button onClick={() => handleCopy(apiKey, "apikey")}
              className="shrink-0 p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors">
              {copied === "apikey"
                ? <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" />
                : <Copy className="w-3.5 h-3.5 text-white/60 hover:text-white/60" />}
            </button>
          </div>
          <p className="text-[9px] text-red-400/60 mt-2">Mantén esta clave en secreto.</p>
        </motion.div>
      </div>

      {/* Documentación */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-[#040704] rounded-xl overflow-hidden">

        {/* Header docs */}
        <div className="px-4 py-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-[#4ade80]" />
            <p className="text-[8px] font-bold uppercase tracking-widest text-white/75">Referencia</p>
          </div>
          <h3 className="text-sm font-black text-white mb-2">Documentación de API</h3>
          <div className="flex items-center gap-2.5 bg-white/[0.04] rounded-lg px-3 py-2">
            <Server className="w-3.5 h-3.5 text-white/60 shrink-0" />
            <div>
              <span className="text-[8px] text-white/60 uppercase tracking-wider block">URL Base</span>
              <span className="text-xs font-mono text-white/70">{baseUrl}</span>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="p-4 space-y-3">
          {codeExamples.map((ex, idx) => (
            <motion.div key={ex.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.06 }}
              className="bg-white/[0.02] rounded-xl overflow-hidden">

              {/* Endpoint header */}
              <div className="px-3 py-2.5 border-b border-white/[0.04] flex flex-wrap items-center gap-2.5 bg-black/20">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase
                  ${ex.method === "POST" ? "bg-blue-500/15 text-blue-400" : "bg-[#4ade80]/15 text-[#4ade80]"}`}>
                  {ex.method}
                </span>
                <span className="font-mono text-xs text-white/70">{ex.endpoint}</span>
                <span className="text-[10px] text-white/60 ml-auto hidden sm:block">{ex.title}</span>
              </div>

              <div className="p-3 space-y-3">
                <p className="text-[11px] text-white/75 leading-relaxed">{ex.description}</p>

                {ex.steps && (
                  <ol className="space-y-1.5">
                    {ex.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 w-4 h-4 rounded-full bg-[#4ade80]/10 text-[#4ade80] text-[9px] font-black flex items-center justify-center shrink-0">{i+1}</span>
                        <span className="text-[11px] text-white/75 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {ex.body && (
                  <div>
                    <p className="text-[8px] text-white/60 uppercase tracking-widest font-bold mb-1.5">JSON body</p>
                    <pre className="bg-black/30 rounded-lg p-3 text-[11px] font-mono text-white/60 overflow-x-auto">
                      <code>{ex.body}</code>
                    </pre>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[8px] text-white/60 uppercase tracking-widest font-bold flex items-center gap-1.5">
                      <Terminal className="w-3 h-3" /> cURL
                    </p>
                    <button onClick={() => handleCopy(ex.curl, ex.id)}
                      className="text-[9px] flex items-center gap-1 text-white/60 hover:text-white/60 transition-colors
                                 py-0.5 px-2 rounded hover:bg-white/[0.04]">
                      {copied === ex.id
                        ? <><CheckCircle2 className="w-3 h-3 text-[#4ade80]" /> Copiado</>
                        : <><Copy className="w-3 h-3" /> Copiar</>}
                    </button>
                  </div>
                  <pre className="bg-black/30 rounded-lg p-3 text-[11px] font-mono text-[#4ade80]/70 overflow-x-auto leading-relaxed">
                    <code>{ex.curl}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
