import React from "react";
import { Terminal, Shield, Cpu, HardDrive, RefreshCw, Activity, Layers, Code2, Globe } from "lucide-react";
import { SystemInfo } from "../types";

interface HeaderProps {
  systemInfo: SystemInfo | null;
  activeTab: "chat" | "terminal" | "binary" | "api" | "tools";
  setActiveTab: (tab: "chat" | "terminal" | "binary" | "api" | "tools") => void;
  isLoadingInfo: boolean;
  onRefreshInfo: () => void;
  reMode: boolean;
  setReMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemInfo,
  activeTab,
  setActiveTab,
  isLoadingInfo,
  onRefreshInfo,
  reMode,
  setReMode,
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-30">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-950">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold text-lg text-zinc-100 tracking-tight">
                TEVI
              </h1>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                v1.0.4
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans">
              Personal Server & Reverse Engineering Assistant
            </p>
          </div>
        </div>

        {/* System telemetry bar */}
        <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 flex-wrap">
          {systemInfo && (
            <>
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>{systemInfo.cpu.cores} Cores</span>
                <span className="text-zinc-600">|</span>
                <span>Load: {systemInfo.cpu.loadAvg[0]?.toFixed(2)}</span>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  RAM: {formatBytes(systemInfo.memory.usedBytes)} / {formatBytes(systemInfo.memory.totalBytes)} ({systemInfo.memory.usedPercentage}%)
                </span>
              </div>

              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>User: {systemInfo.user.username} (UID {systemInfo.user.uid})</span>
              </div>
            </>
          )}

          {/* RE Mode Toggle Button */}
          <button
            onClick={() => setReMode(!reMode)}
            className={`px-2.5 py-1 rounded border text-xs font-mono transition-colors flex items-center gap-1.5 ${
              reMode
                ? "bg-amber-950/40 border-amber-600/80 text-amber-300"
                : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Toggle Reverse Engineering Mode"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{reMode ? "RE MODE: AKTIF" : "ADMIN MODE"}</span>
          </button>

          <button
            onClick={onRefreshInfo}
            disabled={isLoadingInfo}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Refresh System Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingInfo ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 border-t border-zinc-800/80 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "chat"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/20"
              : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Tevi AI Console</span>
        </button>

        <button
          onClick={() => setActiveTab("terminal")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "terminal"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/20"
              : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Terminal & Forensik Host</span>
        </button>

        <button
          onClick={() => setActiveTab("binary")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "binary"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/20"
              : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Lab Analisis Biner & Hex</span>
        </button>

        <button
          onClick={() => setActiveTab("api")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "api"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/20"
              : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>API & Protocol Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab("tools")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "tools"
              ? "border-emerald-500 text-emerald-400 bg-emerald-950/20"
              : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Tool Discovery ({systemInfo?.tools.filter(t => t.available).length || 0})</span>
        </button>
      </div>
    </header>
  );
};
