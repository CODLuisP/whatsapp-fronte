import { useState } from "react";
import { Terminal, Copy, CheckCircle2, Server, Key, User, BookOpen } from "lucide-react";
import { motion } from "motion/react";

interface ApiViewProps {
  apiKey: string;
  userName: string;
  baseUrl: string;
}

export default function ApiView({ apiKey, userName, baseUrl }: ApiViewProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const codeExamples = [
    {
      id: "send-text",
      title: "Enviar mensaje de texto",
      method: "POST",
      endpoint: "/api/send/single",
      description: "Envía un mensaje de texto simple a un número de WhatsApp. El número debe incluir el código de país sin el símbolo +.",
      steps: null,
      body: `{
  "phone": "51987654321",
  "type": "texto",
  "text": "Hola, este es un mensaje de prueba desde la API."
}`,
      curl: `curl -X POST ${baseUrl}/api/send/single \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "phone": "51987654321",
    "type": "texto",
    "text": "Hola, este es un mensaje de prueba desde la API."
  }'`,
    },
    {
      id: "send-image",
      title: "Enviar imagen",
      method: "POST",
      endpoint: "/api/upload  →  /api/send/single",
      description:
        "Requiere dos pasos: primero sube la imagen con /api/upload (multipart/form-data, clave file), luego usa la URL devuelta para enviarla.",
      steps: [
        "Sube el archivo con POST /api/upload usando form-data (clave: file). Guarda la url de la respuesta.",
        "Envía el mensaje con la URL obtenida:",
      ],
      body: `{
  "phone": "51987654321",
  "type": "imagen",
  "file_url": "http://tu-servidor/uploads/imagen.jpg",
  "text": "Caption opcional de la imagen"
}`,
      curl: `# Paso 1 — subir imagen
curl -X POST ${baseUrl}/api/upload \\
  -H "x-api-key: ${apiKey}" \\
  -F "file=@/ruta/a/tu/imagen.jpg"

# Paso 2 — enviar imagen
curl -X POST ${baseUrl}/api/send/single \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "phone": "51987654321",
    "type": "imagen",
    "file_url": "http://tu-servidor/uploads/imagen.jpg",
    "text": "Caption opcional de la imagen"
  }'`,
    },
    {
      id: "send-document",
      title: "Enviar documento (PDF, Word, Excel…)",
      method: "POST",
      endpoint: "/api/upload  →  /api/send/single",
      description:
        "Igual que imagen pero con type: documento. Incluye filename y mime_type para que WhatsApp muestre el nombre y el ícono correcto del archivo.",
      steps: [
        "Sube el archivo con POST /api/upload usando form-data (clave: file). Guarda la url de la respuesta.",
        "Envía el mensaje con la URL obtenida, el nombre del archivo y su MIME type:",
      ],
      body: `{
  "phone": "51987654321",
  "type": "documento",
  "file_url": "http://tu-servidor/uploads/factura.pdf",
  "filename": "Factura_F001-00234.pdf",
  "mime_type": "application/pdf",
  "text": "Adjuntamos tu factura del mes de abril"
}`,
      curl: `# Paso 1 — subir documento
curl -X POST ${baseUrl}/api/upload \\
  -H "x-api-key: ${apiKey}" \\
  -F "file=@/ruta/a/tu/factura.pdf"

# Paso 2 — enviar documento
curl -X POST ${baseUrl}/api/send/single \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "phone": "51987654321",
    "type": "documento",
    "file_url": "http://tu-servidor/uploads/factura.pdf",
    "filename": "Factura_F001-00234.pdf",
    "mime_type": "application/pdf",
    "text": "Adjuntamos tu factura del mes de abril"
  }'`,
    },
    {
      id: "check-status",
      title: "Verificar estado de conexión",
      method: "GET",
      endpoint: "/api/status",
      description:
        "Obtiene el estado actual de la sesión de WhatsApp vinculada al API Key. No requiere body.",
      steps: null,
      body: "",
      curl: `curl -X GET ${baseUrl}/api/status \\
  -H "x-api-key: ${apiKey}"`,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">

      {/* Credenciales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111111] border border-white/5 p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <User className="text-[#25D366] w-6 h-6" />
              Credenciales de usuario
            </h2>
            <div className="bg-black/50 border border-white/5 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">
                Nombre de usuario
              </p>
              <p className="text-white font-medium">{userName}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#111111] border border-white/5 p-6 rounded-3xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Key className="text-[#25D366] w-6 h-6" />
              Tu API Key (x-api-key)
            </h2>
            <div className="bg-black/50 border border-white/5 rounded-xl p-4 flex items-center justify-between group">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">
                  Token de autenticación
                </p>
                <p className="text-green-400 font-mono text-sm break-all">{apiKey}</p>
              </div>
              <button
                onClick={() => handleCopy(apiKey, "apikey")}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0 ml-4"
                title="Copiar API Key"
              >
                {copied === "apikey" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400 group-hover:text-white" />
                )}
              </button>
            </div>
            <p className="text-xs text-red-400/80 mt-3">
              Mantén esta clave en secreto. Da acceso a enviar mensajes en tu nombre.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Documentación */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#111111] border border-white/5 rounded-3xl p-6 md:p-8"
      >
        <div className="mb-8 border-b border-white/5 pb-6">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
            <BookOpen className="text-[#25D366] w-8 h-8" />
            Documentación de referencia
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Usa estos endpoints para integrar WhatsApp en tus sistemas. Todas las
            peticiones requieren el header{" "}
            <code className="text-green-400 bg-green-400/10 px-1 py-0.5 rounded text-xs">
              x-api-key
            </code>
            .
          </p>
          <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5 flex items-center gap-3">
            <Server className="text-gray-500 w-5 h-5 shrink-0" />
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
                URL base
              </span>
              <span className="text-white font-mono text-sm">{baseUrl}</span>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {codeExamples.map((ex, idx) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.08 }}
              className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden"
            >
              {/* Header del endpoint */}
              <div className="p-5 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 bg-black/50">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      ex.method === "POST"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {ex.method}
                  </span>
                  <span className="font-mono text-white text-sm">{ex.endpoint}</span>
                </div>
                <h3 className="text-white font-semibold text-sm hidden md:block">
                  {ex.title}
                </h3>
              </div>

              <div className="p-5 md:p-6 space-y-5">
                <p className="text-gray-400 text-sm leading-relaxed">{ex.description}</p>

                {/* Pasos numerados (solo para imagen y documento) */}
                {ex.steps && (
                  <ol className="space-y-2">
                    {ex.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-[#25D366]/15 text-[#25D366] text-[11px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-300 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {/* JSON Body */}
                {ex.body && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-widest">
                      JSON body
                    </p>
                    <pre className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl text-sm font-mono text-gray-300 overflow-x-auto">
                      <code>{ex.body}</code>
                    </pre>
                  </div>
                )}

                {/* cURL */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5" /> cURL
                    </p>
                    <button
                      onClick={() => handleCopy(ex.curl, ex.id)}
                      className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
                    >
                      {copied === ex.id ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-green-500" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-[#0a0a0a] border border-white/5 px-4 py-4 rounded-xl text-sm font-mono text-green-400/80 overflow-x-auto leading-relaxed">
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