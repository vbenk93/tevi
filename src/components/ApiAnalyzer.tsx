import React, { useState } from "react";
import { Globe, Send, ShieldCheck, ShieldAlert, Copy, Check, Clock, Server } from "lucide-react";
import { ApiResponseData } from "../types";

export const ApiAnalyzer: React.FC = () => {
  const [url, setUrl] = useState("http://localhost:3000/api/health");
  const [method, setMethod] = useState("GET");
  const [headersText, setHeadersText] = useState('{\n  "Accept": "application/json"\n}');
  const [bodyText, setBodyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const samplePresets = [
    { label: "Local Health API", url: "http://localhost:3000/api/health", method: "GET" },
    { label: "Local System Info", url: "http://localhost:3000/api/system/info", method: "GET" },
  ];

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      let parsedHeaders = {};
      try {
        if (headersText.trim()) {
          parsedHeaders = JSON.parse(headersText);
        }
      } catch {
        setError("Format JSON headers tidak valid.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/api-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          method,
          headers: parsedHeaders,
          body: bodyText ? bodyText : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menguji endpoint API.");
      }
      setResponse(data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memanggil endpoint.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyBody = () => {
    if (!response) return;
    const content = response.isJson ? JSON.stringify(response.jsonData, null, 2) : response.bodyText;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] max-w-7xl mx-auto px-4 sm:px-6 py-4 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-mono">
            <Globe className="w-5 h-5 text-emerald-400" />
            API & PROTOCOL REVERSE ENGINEERING INSPECTOR
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Analisis endpoint, validasi header HTTP, evaluasi CORS, proteksi clickjacking (X-Frame-Options), CSP, dan audit celah response.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {samplePresets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setUrl(p.url);
                setMethod(p.method);
              }}
              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Request Form */}
      <form onSubmit={handleSend} className="space-y-3 mb-4 bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
        <div className="flex gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>

          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.domain.com/v1/resource atau http://localhost:3000/api/..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isLoading ? "Menguji..." : "Kirim Permintaan"}</span>
          </button>
        </div>

        {/* Headers and Body Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div>
            <label className="block text-zinc-400 mb-1 text-[11px]">Request Headers (JSON format):</label>
            <textarea
              rows={3}
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:border-emerald-500 text-[11px]"
            />
          </div>

          {["POST", "PUT", "PATCH"].includes(method) && (
            <div>
              <label className="block text-zinc-400 mb-1 text-[11px]">Request Body (Payload):</label>
              <textarea
                rows={3}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 focus:outline-none focus:border-emerald-500 text-[11px]"
              />
            </div>
          )}
        </div>
      </form>

      {/* Error display */}
      {error && (
        <div className="p-3 mb-4 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono">
          <strong>Error Pengujian:</strong> {error}
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="space-y-4">
          {/* Status & Latency Badge Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded font-bold ${
                response.status >= 200 && response.status < 300
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : response.status >= 400
                  ? "bg-rose-950 text-rose-400 border border-rose-800"
                  : "bg-amber-950 text-amber-400 border border-amber-800"
              }`}>
                STATUS: {response.status} {response.statusText}
              </span>
              <span className="text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                {response.latencyMs} ms
              </span>
            </div>

            <button
              onClick={handleCopyBody}
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Tersalin" : "Salin Body"}</span>
            </button>
          </div>

          {/* Security Headers Assessment Grid */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs font-mono space-y-3">
            <div className="text-zinc-300 font-semibold flex items-center gap-1.5 border-b border-zinc-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Audit Keamanan Response Headers (Security Posture)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase">Strict-Transport-Security (HSTS)</div>
                <div className={`mt-1 font-semibold flex items-center gap-1 ${response.securityHeaders.hsts !== "Tidak terpasang" ? "text-emerald-400" : "text-amber-400"}`}>
                  {response.securityHeaders.hsts !== "Tidak terpasang" ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span className="truncate">{response.securityHeaders.hsts}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase">Content-Security-Policy (CSP)</div>
                <div className={`mt-1 font-semibold flex items-center gap-1 ${response.securityHeaders.contentSecurityPolicy !== "Tidak terpasang" ? "text-emerald-400" : "text-amber-400"}`}>
                  {response.securityHeaders.contentSecurityPolicy !== "Tidak terpasang" ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span className="truncate">{response.securityHeaders.contentSecurityPolicy}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase">X-Frame-Options (Clickjacking)</div>
                <div className={`mt-1 font-semibold flex items-center gap-1 ${response.securityHeaders.xFrameOptions !== "Tidak terpasang" ? "text-emerald-400" : "text-amber-400"}`}>
                  {response.securityHeaders.xFrameOptions !== "Tidak terpasang" ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span className="truncate">{response.securityHeaders.xFrameOptions}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase">X-Content-Type-Options</div>
                <div className={`mt-1 font-semibold flex items-center gap-1 ${response.securityHeaders.xContentTypeOptions !== "Tidak terpasang" ? "text-emerald-400" : "text-amber-400"}`}>
                  {response.securityHeaders.xContentTypeOptions !== "Tidak terpasang" ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span className="truncate">{response.securityHeaders.xContentTypeOptions}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase">CORS Configuration</div>
                <div className="mt-1 font-semibold text-zinc-300 truncate">
                  {response.securityHeaders.cors}
                </div>
              </div>

              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                <div className="text-zinc-500 text-[10px] uppercase">Server Software Disclosure</div>
                <div className="mt-1 font-semibold text-zinc-300 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="truncate">{response.securityHeaders.serverHeader}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Response Headers & Body Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs font-mono">
            {/* Headers List */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-2">
              <div className="text-zinc-400 font-semibold border-b border-zinc-800 pb-1">
                Response Headers ({Object.keys(response.headers).length})
              </div>
              <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                {Object.entries(response.headers).map(([key, val]) => (
                  <div key={key} className="py-1 border-b border-zinc-900/60 text-[11px]">
                    <span className="text-cyan-400">{key}:</span>{" "}
                    <span className="text-zinc-300 break-all">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Body Payload */}
            <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-2">
              <div className="text-zinc-400 font-semibold border-b border-zinc-800 pb-1 flex items-center justify-between">
                <span>Response Body ({response.isJson ? "JSON" : "Raw Text"})</span>
                <span className="text-[11px] text-zinc-500">{response.bodyText.length} karakter</span>
              </div>
              <pre className="max-h-80 overflow-y-auto p-3 bg-zinc-900 rounded text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                <code>
                  {response.isJson
                    ? JSON.stringify(response.jsonData, null, 2)
                    : response.bodyText || "(Body kosong)"}
                </code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
