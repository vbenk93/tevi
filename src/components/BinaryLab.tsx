import React, { useState } from "react";
import { Upload, FileCode, Search, Copy, Check, Sparkles, Hash, Layers, ShieldCheck, Binary, Cpu } from "lucide-react";
import { BinaryReport } from "../types";

interface BinaryLabProps {
  binaryReport: BinaryReport | null;
  onInspectFile: (file: File) => Promise<void>;
  onInspectSystemPath: (path: string) => Promise<void>;
  isAnalyzing: boolean;
  onSendToTevi: (report: BinaryReport) => void;
}

export const BinaryLab: React.FC<BinaryLabProps> = ({
  binaryReport,
  onInspectFile,
  onInspectSystemPath,
  isAnalyzing,
  onSendToTevi,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "hex" | "strings">("overview");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [stringSearch, setStringSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hexSearch, setHexSearch] = useState("");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onInspectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onInspectFile(e.target.files[0]);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(key);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredStrings = binaryReport?.sampleStrings.filter((s) => {
    const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
    const matchesText = !stringSearch || s.text.toLowerCase().includes(stringSearch.toLowerCase());
    return matchesCategory && matchesText;
  }) || [];

  const filteredHex = binaryReport?.hexDump.filter((row) => {
    if (!hexSearch) return true;
    return (
      row.offsetHex.toLowerCase().includes(hexSearch.toLowerCase()) ||
      row.ascii.toLowerCase().includes(hexSearch.toLowerCase()) ||
      row.hexPairs.some((h) => h.toLowerCase().includes(hexSearch.toLowerCase()))
    );
  }) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] max-w-7xl mx-auto px-4 sm:px-6 py-4 overflow-y-auto">
      {/* Top Header & Loaders */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2 font-mono">
            <Layers className="w-5 h-5 text-emerald-400" />
            REVERSE ENGINEERING & BINARY LAB
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Analisis statis berkas biner (ELF, PE, APK, Firmware, WASM, Script), hash, tabel header, strings, dan hexdump.
          </p>
        </div>

        {/* Preset Sample Binary loaders */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500 font-mono">Contoh Biner:</span>
          <button
            onClick={() => onInspectSystemPath("./sshx")}
            disabled={isAnalyzing}
            className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-emerald-700 text-xs font-mono text-emerald-300 hover:text-emerald-200 transition-colors disabled:opacity-50 font-semibold"
          >
            ./sshx (Collaborative Shell)
          </button>
          <button
            onClick={() => onInspectSystemPath("/bin/echo")}
            disabled={isAnalyzing}
            className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-colors disabled:opacity-50"
          >
            /bin/echo (ELF 64-bit)
          </button>
          <button
            onClick={() => onInspectSystemPath("/usr/bin/file")}
            disabled={isAnalyzing}
            className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-colors disabled:opacity-50"
          >
            /usr/bin/file (ELF 64-bit)
          </button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="mb-4 border-2 border-dashed border-zinc-800 hover:border-emerald-700/80 bg-zinc-950/60 rounded-xl p-4 text-center transition-colors relative"
      >
        <input
          type="file"
          id="binary-file-input"
          onChange={handleFileChange}
          className="hidden"
          disabled={isAnalyzing}
        />
        <label
          htmlFor="binary-file-input"
          className="cursor-pointer flex flex-col items-center justify-center gap-2 py-2"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-medium text-zinc-200 hover:text-emerald-400">
              Unggah Berkas Target untuk Dianalisis
            </span>
            <span className="text-zinc-500 text-xs ml-2">atau tarik file ke sini</span>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">
            Mendukung: ELF, PE (.exe/.dll), APK, ZIP, Mach-O, firmware dump, shell script, atau raw data
          </p>
        </label>

        {isAnalyzing && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center gap-2 rounded-xl text-xs font-mono text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Mengekstraksi headers, magic bytes, hashes, dan strings...</span>
          </div>
        )}
      </div>

      {/* Binary Details View */}
      {binaryReport ? (
        <div className="space-y-4">
          {/* Action Bar & Summary Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 border border-zinc-800 p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold font-mono text-zinc-100">{binaryReport.filename}</h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                    {binaryReport.format}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono">
                  Ukuran: {(binaryReport.fileSize / 1024).toFixed(2)} KB ({binaryReport.fileSize} bytes) • {binaryReport.architecture} ({binaryReport.bitness})
                </p>
              </div>
            </div>

            <button
              onClick={() => onSendToTevi(binaryReport)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kirim Hasil ke Tevi AI</span>
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex gap-2 border-b border-zinc-800 pb-2 text-xs font-mono">
            <button
              onClick={() => setActiveSubTab("overview")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeSubTab === "overview"
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Overview & Hashes
            </button>
            <button
              onClick={() => setActiveSubTab("hex")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeSubTab === "hex"
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Hex Viewer (XXD)
            </button>
            <button
              onClick={() => setActiveSubTab("strings")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeSubTab === "strings"
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Strings ({binaryReport.sampleStrings.length})
            </button>
          </div>

          {/* Tab 1: Overview & Hashes */}
          {activeSubTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
              {/* Hashes Card */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3">
                <div className="text-zinc-300 font-semibold flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                  <Hash className="w-4 h-4 text-emerald-400" />
                  <span>Kalkulasi Hash Kriptografis</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                      <span>SHA-256:</span>
                      <button
                        onClick={() => copyToClipboard(binaryReport.hashes.sha256, "sha256")}
                        className="hover:text-zinc-300 flex items-center gap-1"
                      >
                        {copiedHash === "sha256" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedHash === "sha256" ? "Tersalin" : "Salin"}</span>
                      </button>
                    </div>
                    <div className="bg-zinc-900 p-2 rounded text-zinc-200 break-all select-all">
                      {binaryReport.hashes.sha256}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                      <span>MD5:</span>
                      <button
                        onClick={() => copyToClipboard(binaryReport.hashes.md5, "md5")}
                        className="hover:text-zinc-300 flex items-center gap-1"
                      >
                        {copiedHash === "md5" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedHash === "md5" ? "Tersalin" : "Salin"}</span>
                      </button>
                    </div>
                    <div className="bg-zinc-900 p-2 rounded text-zinc-200 break-all select-all">
                      {binaryReport.hashes.md5}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                      <span>SHA-1:</span>
                      <button
                        onClick={() => copyToClipboard(binaryReport.hashes.sha1, "sha1")}
                        className="hover:text-zinc-300 flex items-center gap-1"
                      >
                        {copiedHash === "sha1" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedHash === "sha1" ? "Tersalin" : "Salin"}</span>
                      </button>
                    </div>
                    <div className="bg-zinc-900 p-2 rounded text-zinc-200 break-all select-all">
                      {binaryReport.hashes.sha1}
                    </div>
                  </div>
                </div>
              </div>

              {/* Architecture & Format Card */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3">
                <div className="text-zinc-300 font-semibold flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>Arsitektur & Metadata Header</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-zinc-400">
                  <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
                    <div className="text-zinc-500 text-[11px]">Format Biner</div>
                    <div className="text-zinc-100 font-semibold mt-0.5">{binaryReport.format}</div>
                  </div>

                  <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
                    <div className="text-zinc-500 text-[11px]">Arsitektur Mesin</div>
                    <div className="text-zinc-100 font-semibold mt-0.5">{binaryReport.architecture}</div>
                  </div>

                  <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
                    <div className="text-zinc-500 text-[11px]">Bitness & Endian</div>
                    <div className="text-zinc-100 font-semibold mt-0.5">
                      {binaryReport.bitness} • {binaryReport.endianness}
                    </div>
                  </div>

                  <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
                    <div className="text-zinc-500 text-[11px]">Entry Point</div>
                    <div className="text-emerald-400 font-semibold mt-0.5">
                      {binaryReport.elfDetails ? binaryReport.elfDetails.entryPoint : "N/A"}
                    </div>
                  </div>
                </div>

                {binaryReport.elfDetails && (
                  <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800 text-[11px] text-zinc-300 flex items-center justify-between">
                    <span>Position Independent Executable (PIE):</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${binaryReport.elfDetails.isPIE ? "text-emerald-400 bg-emerald-950/60" : "text-amber-400 bg-amber-950/60"}`}>
                      {binaryReport.elfDetails.isPIE ? "ENABLED (ASLR Active)" : "DISABLED"}
                    </span>
                  </div>
                )}

                {binaryReport.nativeFileReport && (
                  <div>
                    <div className="text-zinc-500 text-[11px] mb-1">Native Linux `file` Command Output:</div>
                    <pre className="bg-zinc-900 p-2 rounded text-zinc-300 text-[11px] whitespace-pre-wrap">
                      {binaryReport.nativeFileReport}
                    </pre>
                  </div>
                )}
              </div>

              {/* readelf report if available */}
              {binaryReport.readelfHeader && (
                <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-2">
                  <div className="text-zinc-300 font-semibold flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>ELF Header (`readelf -h`)</span>
                  </div>
                  <pre className="bg-zinc-900 p-3 rounded text-zinc-300 text-xs overflow-x-auto whitespace-pre leading-relaxed">
                    {binaryReport.readelfHeader}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Hex Viewer */}
          {activeSubTab === "hex" && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="text-zinc-400 text-xs">
                  Pratinjau Byte Hex (XXD Style - Offset / Hex Bytes / ASCII)
                </div>
                <div className="relative w-64">
                  <input
                    type="text"
                    value={hexSearch}
                    onChange={(e) => setHexSearch(e.target.value)}
                    placeholder="Cari hex / teks..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-zinc-900/90 rounded border border-zinc-800 p-3 overflow-x-auto max-h-96">
                <div className="grid grid-cols-[80px_1fr_160px] gap-4 font-bold text-zinc-500 border-b border-zinc-800 pb-1 mb-2 text-[11px]">
                  <span>OFFSET</span>
                  <span>HEX BYTES (16 BYTES PER LINE)</span>
                  <span>ASCII</span>
                </div>
                {filteredHex.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[80px_1fr_160px] gap-4 py-0.5 hover:bg-zinc-800/40 text-[11px]">
                    <span className="text-zinc-500">{row.offsetHex}</span>
                    <span className="text-cyan-300 space-x-1 tracking-wide">
                      {row.hexPairs.map((pair, pIdx) => (
                        <span key={pIdx} className={pair === "00" ? "text-zinc-600" : ""}>
                          {pair}
                        </span>
                      ))}
                    </span>
                    <span className="text-emerald-400 font-sans tracking-tight">{row.ascii}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Strings Extraction */}
          {activeSubTab === "strings" && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-500 text-xs">Kategori:</span>
                  {["all", "network", "path", "security", "base64", "credential", "general"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[11px] capitalize transition-colors ${
                        selectedCategory === cat
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
                  <input
                    type="text"
                    value={stringSearch}
                    onChange={(e) => setStringSearch(e.target.value)}
                    placeholder="Filter strings..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded pl-8 pr-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-zinc-900/90 rounded border border-zinc-800 p-2 overflow-y-auto max-h-96 space-y-1">
                {filteredStrings.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500 text-xs">
                    Tidak ada strings yang cocok dengan kriteria filter.
                  </div>
                ) : (
                  filteredStrings.map((str, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1 px-2 hover:bg-zinc-800/60 rounded group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-[10px] text-zinc-600 shrink-0 font-mono w-16">
                          0x{str.offset.toString(16).toUpperCase()}
                        </span>
                        <span className="text-xs text-zinc-200 truncate group-hover:text-emerald-300">
                          {str.text}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {str.category && str.category !== "general" && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            str.category === "network" ? "bg-cyan-950/80 text-cyan-400 border border-cyan-800/60" :
                            str.category === "security" ? "bg-rose-950/80 text-rose-400 border border-rose-800/60" :
                            str.category === "credential" ? "bg-amber-950/80 text-amber-400 border border-amber-800/60" :
                            str.category === "path" ? "bg-purple-950/80 text-purple-400 border border-purple-800/60" :
                            "bg-zinc-800 text-zinc-400"
                          }`}>
                            {str.category}
                          </span>
                        )}
                        <button
                          onClick={() => copyToClipboard(str.text, `str-${idx}`)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-emerald-400 transition-opacity"
                          title="Salin String"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-3 border border-zinc-800/60 rounded-xl bg-zinc-950/40">
          <Binary className="w-12 h-12 text-zinc-700" />
          <h3 className="text-sm font-semibold text-zinc-300">Belum ada berkas biner yang dipilih</h3>
          <p className="text-xs max-w-md text-zinc-500">
            Unggah berkas binary, executable, library, firmware, APK atau klik salah satu biner sistem di atas (seperti <code>/bin/echo</code>) untuk memulai reverse engineering triage.
          </p>
        </div>
      )}
    </div>
  );
};
