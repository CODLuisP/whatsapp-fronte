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
      title: "Enviar Mensaje de Texto",
      method: "POST",
      endpoint: "/api/send/text",
      description: "Envía un mensaje de texto simple a un número de WhatsApp.",
      body: `{
  "number": "51999999999",
  "message": "Hola, este es un mensaje de prueba desde la API."
}`,
      curl: `curl -X POST ${baseUrl}/api/send/text \\
-H "Content-Type: application/json" \\
-H "x-api-key: ${apiKey}" \\
-d '{
  "number": "51999999999",
  "message": "Hola, este es un mensaje de prueba desde la API."
}'`
    },
    {
      id: "send-media",
      title: "Enviar Archivo Multimedia (Media)",
      method: "POST",
      endpoint: "/api/send/media",
      description: "Envía un archivo multimedia (imagen, video, pdf) a través de una URL.",
      body: `{
  "number": "51999999999",
  "url": "https://ejemplo.com/imagen.jpg",
  "caption": "Mira esta imagen",
  "type": "image" 
}`,
      curl: `curl -X POST ${baseUrl}/api/send/media \\
-H "Content-Type: application/json" \\
-H "x-api-key: ${apiKey}" \\
-d '{
  "number": "51999999999",
  "url": "https://ejemplo.com/imagen.jpg",
  "caption": "Mira esta imagen",
  "type": "image"
}'`
    },
    {
       id: "check-status",
       title: "Verificar Estado de Conexión",
       method: "GET",
       endpoint: "/api/status",
       description: "Obtiene el estado actual de la sesión de WhatsApp vinculada.",
       body: "",
       curl: `curl -X GET ${baseUrl}/api/status \\
-H "x-api-key: ${apiKey}"`
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Info */}
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
              Credenciales de Usuario
            </h2>
            <div className="space-y-4">
              <div className="bg-black/50 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Nombre de Usuario</p>
                <p className="text-white font-medium">{userName}</p>
              </div>
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
            <div className="space-y-4">
              <div className="bg-black/50 border border-white/5 rounded-xl p-4 flex items-center justify-between group">
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">Token de Autenticación</p>
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
              <p className="text-xs text-red-400/80 mt-2 flex items-center gap-1">
                Mantén esta clave en secreto. Da acceso a enviar mensajes en tu nombre.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#111111] border border-white/5 rounded-3xl p-6 md:p-8"
      >
        <div className="mb-8 border-b border-white/5 pb-6">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
            <BookOpen className="text-[#25D366] w-8 h-8" />
            Documentación de Referencia
          </h2>
          <p className="text-gray-400">
            Utiliza estos endpoints para integrar WhatsApp en tus propios sistemas y aplicaciones. 
            Todas las peticiones requieren el header <code className="text-green-400 bg-green-400/10 px-1 py-0.5 rounded">x-api-key</code>.
          </p>
          <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5 flex items-center gap-3">
             <Server className="text-gray-500 w-5 h-5" />
             <div>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">URL Base</span>
                <span className="text-white font-mono text-sm">{baseUrl}</span>
             </div>
          </div>
        </div>

        <div className="space-y-10">
          {codeExamples.map((ex, idx) => (
            <motion.div 
              key={ex.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (idx * 0.1) }}
              className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/50">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    ex.method === 'POST' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {ex.method}
                  </span>
                  <span className="font-mono text-white text-sm">{ex.endpoint}</span>
                </div>
                <h3 className="text-white font-bold hidden md:block">{ex.title}</h3>
              </div>
              
              <div className="p-5 md:p-6 space-y-6">
                <p className="text-gray-400 text-sm">{ex.description}</p>
                
                {ex.body && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">JSON Body</p>
                    <div className="relative group">
                      <pre className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl text-sm font-mono text-gray-300 overflow-x-auto">
                        <code>{ex.body}</code>
                      </pre>
                    </div>
                  </div>
                )}

                <div>
                   <div className="flex items-center justify-between mb-2">
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-2">
                       <Terminal className="w-4 h-4" /> cURL Request
                     </p>
                     <button
                        onClick={() => handleCopy(ex.curl, ex.id)}
                        className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-white/5"
                      >
                        {copied === ex.id ? (
                          <><CheckCircle2 className="w-3 h-3 text-green-500" /> Copiado</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copiar código</>
                        )}
                      </button>
                   </div>
                  <div className="relative group">
                    <pre className="bg-[#0a0a0a] border border-white/5 px-4 py-4 rounded-xl text-sm font-mono text-green-400/80 overflow-x-auto scrollbar-thin">
                      <code>{ex.curl}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
