import React, { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon, Play, Copy, Trash2, Check, ShieldAlert, Cpu, ListCheck } from "lucide-react";
import { ExecResult } from "../types";

interface TerminalViewProps {
  logs: ExecResult[];
  onExecute: (cmd: string) => Promise<ExecResult | null>;
  isExecuting: boolean;
  onClearLogs: () => void;
  initialCommand?: string | null;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  logs,
  onExecute,
  isExecuting,
  onClearLogs,
  initialCommand,
}) => {
  const [inputCmd, setInputCmd] = useState(initialCommand || "");
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isRunningChecklist, setIsRunningChecklist] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialCommand) {
      setInputCmd(initialCommand);
      inputRef.current?.focus();
    }
  }, [initialCommand]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, isExecuting]);

  // Standard forensics checklist commands
  const forensicCommands = [
    { label: "1. Kernel & Arch", cmd: "uname -a" },
    { label: "2. OS Release", cmd: "cat /etc/os-release" },
    { label: "3. User & Privileges", cmd: "id" },
    { label: "4. System Uptime", cmd: "uptime" },
    { label: "5. Filesystem Storage", cmd: "df -h" },
    { label: "6. Memory / RAM", cmd: "free -h" },
    { label: "7. CPU Core Count", cmd: "nproc" },
    { label: "8. Active Processes", cmd: "ps aux | head -n 25" },
    { label: "9. Listening Ports", cmd: "ss -lntup || netstat -tlpn 2>/dev/null || ss -tuln" },
    { label: "10. Network Interfaces", cmd: "ip addr || ifconfig -a 2>/dev/null || ip link" },
  ];

  const handleRun = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCmd.trim() || isExecuting) return;
    const cmd = inputCmd.trim();
    setInputCmd("");
    setHistoryIndex(-1);
    await onExecute(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (logs.length > 0) {
        const nextIdx = historyIndex + 1 < logs.length ? historyIndex + 1 : historyIndex;
        setHistoryIndex(nextIdx);
        const item = logs[logs.length - 1 - nextIdx];
        if (item && item.command) {
          setInputCmd(item.command);
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        const item = logs[logs.length - 1 - nextIdx];
        if (item && item.command) {
          setInputCmd(item.command);
        }
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCmd("");
      }
    }
  };

  const handleCopyLog = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Run full forensic audit checklist sequentially
  const handleRunFullChecklist = async () => {
    if (isRunningChecklist || isExecuting) return;
    setIsRunningChecklist(true);
    for (const item of forensicCommands) {
      await onExecute(item.cmd);
      // Brief pause between commands
      await new Promise((r) => setTimeout(r, 400));
    }
    setIsRunningChecklist(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
            <TerminalIcon className="w-4 h-4" />
            LIVE FORENSIC SHELL
          </span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400 font-mono">Status: Read/Write Sandbox Host</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunFullChecklist}
            disabled={isRunningChecklist || isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700/60 text-emerald-300 rounded font-mono text-xs transition-colors disabled:opacity-50"
            title="Jalankan semua 10 command forensik server secara otomatis"
          >
            <ListCheck className="w-3.5 h-3.5" />
            <span>{isRunningChecklist ? "Sedang Mengaudit..." : "Jalankan Audit Forensik Penuh (10 Langkah)"}</span>
          </button>

          <button
            onClick={onClearLogs}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-xs transition-colors"
            title="Bersihkan layar terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan</span>
          </button>
        </div>
      </div>

      {/* Forensic Quick Buttons Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
        <span className="text-[11px] font-mono text-zinc-500 uppercase shrink-0 mr-1 flex items-center gap-1">
          <Cpu className="w-3 h-3 text-cyan-400" />
          Checklist:
        </span>
        {forensicCommands.map((f, idx) => (
          <button
            key={idx}
            onClick={() => onExecute(f.cmd)}
            disabled={isExecuting || isRunningChecklist}
            className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-800 text-[11px] font-mono text-zinc-300 hover:text-emerald-300 whitespace-nowrap transition-colors disabled:opacity-50"
          >
            {f.cmd.split(" ")[0]} ({f.label.split(".")[0]})
          </button>
        ))}
      </div>

      {/* Terminal Display Screen */}
      <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs overflow-y-auto space-y-4 shadow-inner">
        {logs.length === 0 && (
          <div className="text-zinc-500 py-8 text-center space-y-2">
            <p className="text-zinc-400 font-semibold">Tevi Live Execution Console</p>
            <p className="text-[11px] max-w-lg mx-auto">
              Terminal ini terhubung langsung ke environment host container. Jalankan command diagnostik di atas atau ketik langsung di bawah. Seluruh output dijamin <strong>[TERVERIFIKASI]</strong> dan real.
            </p>
          </div>
        )}

        {logs.map((log, idx) => (
          <div key={idx} className="border-b border-zinc-900/80 pb-3 last:border-b-0">
            {/* Command Prompt Line */}
            <div className="flex items-center justify-between text-zinc-400 py-1 bg-zinc-900/40 px-2 rounded">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-emerald-400 font-bold">host@tevi:~$</span>
                <span className="text-zinc-100 font-semibold">{log.command}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 shrink-0 ml-2">
                <span>{log.executionTimeMs}ms</span>
                <span className={`px-1.5 py-0.2 rounded font-mono ${log.exitCode === 0 ? "text-emerald-400 bg-emerald-950/40" : "text-rose-400 bg-rose-950/40"}`}>
                  Exit: {log.exitCode}
                </span>
                <button
                  onClick={() => handleCopyLog(log.stdout || log.stderr, idx)}
                  className="hover:text-zinc-200"
                  title="Salin output"
                >
                  {copiedIndex === idx ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Standard Output */}
            {log.stdout && (
              <pre className="mt-1.5 p-2 text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed bg-black/40 rounded border border-zinc-900/60">
                <code>{log.stdout}</code>
              </pre>
            )}

            {/* Standard Error / Failure */}
            {log.stderr && (
              <pre className="mt-1.5 p-2 text-rose-400 overflow-x-auto whitespace-pre leading-relaxed bg-rose-950/20 rounded border border-rose-900/40">
                <code>{log.stderr}</code>
              </pre>
            )}
          </div>
        ))}

        {isExecuting && (
          <div className="flex items-center gap-2 text-emerald-400 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Mengeksekusi command pada host...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Safety boundary note */}
      <div className="flex items-center gap-2 py-1.5 text-[11px] text-zinc-500">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
        <span>Safety Guardrail Tevi aktif: Command destruktif (rm -rf /, format disk) dicegah secara otomatis.</span>
      </div>

      {/* Input Prompt */}
      <form onSubmit={handleRun} className="flex gap-2">
        <div className="flex-1 flex items-center bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
          <span className="text-emerald-400 font-bold mr-2 select-none">host@tevi:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputCmd}
            onChange={(e) => setInputCmd(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik command linux (contoh: ls -la, ps aux, ss -lntup, lscpu)..."
            disabled={isExecuting || isRunningChecklist}
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none text-xs"
          />
        </div>

        <button
          type="submit"
          disabled={isExecuting || isRunningChecklist || !inputCmd.trim()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-mono rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Jalankan</span>
        </button>
      </form>
    </div>
  );
};
