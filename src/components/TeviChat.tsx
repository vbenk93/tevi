import React, { useState, useRef, useEffect } from "react";
import { Send, Terminal, Sparkles, Copy, Check, Play, AlertCircle, ShieldCheck } from "lucide-react";
import { ChatMessage, SystemInfo, BinaryReport } from "../types";

interface TeviChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  systemInfo: SystemInfo | null;
  activeBinary: BinaryReport | null;
  onExecuteInTerminal: (cmd: string) => void;
  onClearHistory: () => void;
  reMode: boolean;
}

export const TeviChat: React.FC<TeviChatProps> = ({
  messages,
  onSendMessage,
  isLoading,
  systemInfo,
  activeBinary,
  onExecuteInTerminal,
  onClearHistory,
  reMode,
}) => {
  const [inputText, setInputText] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const quickPrompts = [
    {
      title: "Server Forensics Checklist",
      desc: "Jalankan audit bertahap (uname, os-release, id, df, free, ps, ss, ip)",
      text: "Tolong lakukan audit Server Forensics bertahap pada server ini sesuai checklist wajib.",
    },
    {
      title: "Audit Listening Ports",
      desc: "Periksa port dan service yang sedang listening",
      text: "Periksa port yang terbuka dan listening di host ini menggunakan ss -lntup.",
    },
    {
      title: "Workflow Analisis Biner",
      desc: "Panduan metodis analisis biner & file executable",
      text: "Aktifkan REVERSE ENGINEERING MODE dan jelaskan workflow lengkap analisis file biner ELF/PE.",
    },
    {
      title: "API Reverse Engineering",
      desc: "Checklist pengujian endpoint, auth, headers, dan CORS",
      text: "Berikan panduan sistematis untuk reverse engineering API dan endpoint web.",
    },
  ];

  // Helper to render markdown-like text with highlighted badges and code blocks
  const renderMessageContent = (content: string, msgId: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        const lang = lines[0]?.match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : "";
        const codeContent = lang ? lines.slice(1).join("\n") : lines.join("\n");
        const isSingleCommand = !codeContent.includes("\n") || codeContent.split("\n").length <= 3;

        return (
          <div key={pIdx} className="my-2.5 rounded-md overflow-hidden border border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-xs font-mono text-zinc-400">
              <span>{lang || "command / output"}</span>
              <div className="flex items-center gap-2">
                {isSingleCommand && (
                  <button
                    onClick={() => onExecuteInTerminal(codeContent.trim())}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-0.5 rounded hover:bg-emerald-950/40"
                    title="Jalankan langsung di Terminal"
                  >
                    <Play className="w-3 h-3" />
                    <span>Jalankan di Host</span>
                  </button>
                )}
                <button
                  onClick={() => handleCopy(codeContent, `${msgId}-${pIdx}`)}
                  className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {copiedIndex === `${msgId}-${pIdx}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre className="p-3 text-xs font-mono text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      // Format inline markers
      return (
        <div key={pIdx} className="space-y-2 whitespace-pre-wrap leading-relaxed text-sm">
          {part.split("\n").map((line, lIdx) => {
            // Check for [TERVERIFIKASI] badge
            if (line.includes("[TERVERIFIKASI]") || line.includes("TERVERIFIKASI")) {
              return (
                <div key={lIdx} className="flex items-start gap-2 my-1 text-emerald-300 bg-emerald-950/20 px-2.5 py-1.5 rounded border border-emerald-800/40">
                  <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                  <div>{line}</div>
                </div>
              );
            }
            // Check for [HIPOTESIS] badge
            if (line.includes("[HIPOTESIS]") || line.includes("HIPOTESIS")) {
              return (
                <div key={lIdx} className="flex items-start gap-2 my-1 text-amber-300 bg-amber-950/20 px-2.5 py-1.5 rounded border border-amber-800/40">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                  <div>{line}</div>
                </div>
              );
            }
            return <p key={lIdx}>{line}</p>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Context banner */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-zinc-800/60 text-xs text-zinc-400">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 font-mono">Target Host:</span>
          <span className="font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
            {systemInfo ? `${systemInfo.hostname} (${systemInfo.osReleaseInfo || systemInfo.platform})` : "Local Host"}
          </span>

          {activeBinary && (
            <span className="font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50 flex items-center gap-1">
              <span>Biner Aktif:</span>
              <strong>{activeBinary.filename}</strong>
              <span>({activeBinary.format})</span>
            </span>
          )}

          {reMode && (
            <span className="text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50 font-mono">
              ⚡ REVERSE ENGINEERING MODE AKTIF
            </span>
          )}
        </div>

        <button
          onClick={onClearHistory}
          className="text-xs text-zinc-500 hover:text-zinc-300 hover:underline"
        >
          Bersihkan Obrolan
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0 font-mono text-xs font-bold shadow-sm shadow-emerald-950">
                TV
              </div>
            )}

            <div
              className={`max-w-3xl rounded-lg px-4 py-3 border ${
                msg.role === "user"
                  ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                  : "bg-zinc-900/90 border-zinc-800 text-zinc-200 shadow-md shadow-black/20"
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-1 text-[11px] font-mono text-zinc-500">
                <span className="font-semibold text-zinc-400">
                  {msg.role === "user" ? "Anda" : "Tevi"}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="text-sm">
                {renderMessageContent(msg.content, msg.id)}
              </div>
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 font-mono text-xs font-bold">
                U
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0 font-mono text-xs font-bold">
              TV
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-xs text-zinc-400 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Tevi sedang menganalisis dan memverifikasi data teknis...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 my-3">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(q.text)}
              className="text-left p-2.5 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-emerald-800/50 transition-all text-xs group"
            >
              <div className="font-medium text-zinc-200 group-hover:text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{q.title}</span>
              </div>
              <p className="text-zinc-500 text-[11px] mt-1 line-clamp-2">{q.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            <Terminal className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tanyakan ke Tevi: administrasi server, forensik, analisis biner, strings, API..."
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shrink-0 shadow-sm"
        >
          <span>Kirim</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
