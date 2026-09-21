import React, { useState } from "react";
import { ShieldCheck, Search, CheckCircle2, XCircle, Terminal, Play, Wrench } from "lucide-react";
import { ToolItem } from "../types";

interface ToolDiscoveryProps {
  tools: ToolItem[];
  onExecuteInTerminal: (cmd: string) => void;
}

export const ToolDiscovery: React.FC<ToolDiscoveryProps> = ({ tools, onExecuteInTerminal }) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "available" | "missing">("all");

  const availableCount = tools.filter((t) => t.available).length;
  const missingCount = tools.length - availableCount;

  const filteredTools = tools.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.version && t.version.toLowerCase().includes(search.toLowerCase()));
    if (filter === "available") return matchesSearch && t.available;
    if (filter === "missing") return matchesSearch && !t.available;
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] max-w-7xl mx-auto px-4 sm:px-6 py-4 overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-mono">
            <Wrench className="w-5 h-5 text-emerald-400" />
            TOOL DISCOVERY & ENVIRONMENT INVENTORY
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sesuai prinsip <strong>Execution-First Policy</strong> Tevi, seluruh kapabilitas dan alat di host diverifikasi langsung secara nyata tanpa klaim palsu.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
            {availableCount} Tersedia
          </span>
          <span className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
            {missingCount} Belum Terpasang
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded transition-colors ${
              filter === "all"
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Semua ({tools.length})
          </button>
          <button
            onClick={() => setFilter("available")}
            className={`px-3 py-1 rounded transition-colors ${
              filter === "available"
                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Tersedia ({availableCount})
          </button>
          <button
            onClick={() => setFilter("missing")}
            className={`px-3 py-1 rounded transition-colors ${
              filter === "missing"
                ? "bg-zinc-900 text-zinc-300 border border-zinc-800"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Belum Ada ({missingCount})
          </button>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tool (gcc, file, strings)..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded pl-8 pr-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>
      </div>

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTools.map((tool) => (
          <div
            key={tool.name}
            className={`p-3 rounded-lg border font-mono text-xs transition-colors ${
              tool.available
                ? "bg-zinc-950 border-zinc-800/80 hover:border-emerald-800/60"
                : "bg-zinc-950/40 border-zinc-900 text-zinc-600"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm ${tool.available ? "text-zinc-100" : "text-zinc-500"}`}>
                  {tool.name}
                </span>
                {tool.available ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.2 rounded border border-emerald-800/50">
                    <CheckCircle2 className="w-3 h-3" />
                    VERIFIED
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.2 rounded">
                    <XCircle className="w-3 h-3" />
                    NOT FOUND
                  </span>
                )}
              </div>

              {tool.available && (
                <button
                  onClick={() => onExecuteInTerminal(`which ${tool.name} && ${tool.name} --version || ${tool.name} -v`)}
                  className="p-1 hover:text-emerald-400 text-zinc-500 transition-colors"
                  title={`Uji ${tool.name} di terminal`}
                >
                  <Play className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="text-[11px] space-y-1 text-zinc-400">
              {tool.path && (
                <div className="text-zinc-500 truncate">
                  Path: <span className="text-zinc-400">{tool.path}</span>
                </div>
              )}
              <div className="truncate text-zinc-400">
                {tool.version}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
