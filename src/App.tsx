import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { TeviChat } from "./components/TeviChat";
import { TerminalView } from "./components/TerminalView";
import { BinaryLab } from "./components/BinaryLab";
import { ApiAnalyzer } from "./components/ApiAnalyzer";
import { ToolDiscovery } from "./components/ToolDiscovery";
import { SystemInfo, ExecResult, BinaryReport, ChatMessage } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "terminal" | "binary" | "api" | "tools">("chat");
  const [reMode, setReMode] = useState<boolean>(true);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState<boolean>(false);

  // Terminal state
  const [terminalLogs, setTerminalLogs] = useState<ExecResult[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [stagedCommand, setStagedCommand] = useState<string | null>(null);

  // Binary Lab state
  const [binaryReport, setBinaryReport] = useState<BinaryReport | null>(null);
  const [isAnalyzingBinary, setIsAnalyzingBinary] = useState<boolean>(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "initial-tevi-welcome",
      role: "assistant",
      content: `Halo! Nama saya **Tevi** — Personal Server & Reverse Engineering Assistant Anda.

Saya siap membantu Anda dalam:
- 🛠️ **Administrasi Server & Troubleshooting Linux**
- 🔍 **Audit Forensik Host** (memeriksa \`uname\`, \`os-release\`, \`id\`, \`uptime\`, \`df\`, \`free\`, \`ps aux\`, \`ss -lntup\`, dll.)
- 🔬 **Reverse Engineering Mode** (analisis biner ELF/PE/APK, ekstraksi strings, tabel section, readelf, hexdump)
- 🌐 **API & Protocol Inspection** (audit headers, CORS, mitigasi X-Frame/HSTS, request timing)
- 🛡️ **Execution-First Policy**: Saya membedakan secara tegas antara fakta yang **[TERVERIFIKASI]** dan **[HIPOTESIS]**.

Ada yang bisa saya bantu verifikasi atau analisis di server ini sekarang?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Fetch system info with automatic retry
  const fetchSystemInfo = useCallback(async (retryCount = 0) => {
    setIsLoadingInfo(true);
    try {
      const res = await fetch("/api/system/info");
      if (res.ok) {
        const data = await res.json();
        setSystemInfo(data);
      } else if (retryCount < 2) {
        setTimeout(() => fetchSystemInfo(retryCount + 1), 2000);
      }
    } catch (err) {
      console.warn("Gagal mengambil system info:", err);
      if (retryCount < 2) {
        setTimeout(() => fetchSystemInfo(retryCount + 1), 2000);
      }
    } finally {
      setIsLoadingInfo(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemInfo();
  }, [fetchSystemInfo]);

  // Execute terminal command
  const handleExecuteCommand = async (cmd: string): Promise<ExecResult | null> => {
    setIsExecuting(true);
    try {
      const res = await fetch("/api/system/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { stderr: "Gagal membaca respons dari server (non-JSON response)." };
      }

      const result: ExecResult = {
        command: cmd,
        stdout: data.stdout || "",
        stderr: data.stderr || (!res.ok ? `HTTP Error ${res.status}` : ""),
        exitCode: data.exitCode !== undefined ? data.exitCode : (!res.ok ? 1 : 0),
        executionTimeMs: data.executionTimeMs || 0,
        timestamp: new Date().toLocaleTimeString(),
      };
      setTerminalLogs((prev) => [...prev, result]);
      return result;
    } catch (err: any) {
      const isFailedToFetch = err.message?.includes("Failed to fetch") || err.name === "TypeError";
      const errResult: ExecResult = {
        command: cmd,
        stdout: "",
        stderr: isFailedToFetch
          ? "[CONNECTION ERROR] Gagal menghubungi server host (Failed to fetch). Sedang menyambung ulang..."
          : (err.message || "Gagal mengeksekusi command pada host."),
        exitCode: 1,
        executionTimeMs: 0,
        timestamp: new Date().toLocaleTimeString(),
      };
      setTerminalLogs((prev) => [...prev, errResult]);
      return errResult;
    } finally {
      setIsExecuting(false);
    }
  };

  // Inspect uploaded binary file
  const handleInspectFile = async (file: File) => {
    setIsAnalyzingBinary(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = (reader.result as string).split(",")[1];
          const res = await fetch("/api/re/inspect-binary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              base64Data: base64String,
              filename: file.name,
            }),
          });

          if (res.ok) {
            const report = await res.json();
            setBinaryReport(report);
          } else {
            let errorMsg = "Format tidak didukung";
            try {
              const err = await res.json();
              errorMsg = err.error || errorMsg;
            } catch {}
            alert(`Gagal menganalisis file: ${errorMsg}`);
          }
        } catch (fetchErr: any) {
          alert(`Gagal mengunggah biner: ${fetchErr.message || "Koneksi terputus"}`);
        } finally {
          setIsAnalyzingBinary(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      alert(`Gagal membaca file: ${err.message || "Unknown error"}`);
      setIsAnalyzingBinary(false);
    }
  };

  // Inspect system binary path directly
  const handleInspectSystemPath = async (systemPath: string) => {
    setIsAnalyzingBinary(true);
    try {
      const res = await fetch("/api/re/inspect-binary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPath }),
      });
      if (res.ok) {
        const report = await res.json();
        setBinaryReport(report);
      } else {
        let errorMsg = `File ${systemPath} tidak dapat diakses.`;
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch {}
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Gagal memeriksa biner sistem: ${err.message || "Koneksi terputus"}`);
    } finally {
      setIsAnalyzingBinary(false);
    }
  };

  // Send message to Tevi AI
  const handleSendMessage = async (userText: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setIsChatLoading(true);

    try {
      // Build active technical context
      const activeContext = {
        host: systemInfo
          ? {
              hostname: systemInfo.hostname,
              os: systemInfo.osReleaseInfo,
              user: systemInfo.user.username,
              cores: systemInfo.cpu.cores,
              memoryUsedPercent: systemInfo.memory.usedPercentage,
              availableToolsCount: systemInfo.tools.filter((t) => t.available).length,
            }
          : null,
        activeBinaryReport: binaryReport
          ? {
              filename: binaryReport.filename,
              format: binaryReport.format,
              architecture: binaryReport.architecture,
              sha256: binaryReport.hashes.sha256,
              elfDetails: binaryReport.elfDetails,
              stringsCount: binaryReport.totalStringsFound,
              suspiciousStrings: binaryReport.sampleStrings
                .filter((s) => s.category && s.category !== "general")
                .slice(0, 15),
            }
          : null,
        reModeActive: reMode,
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          activeContext,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Respons server tidak valid (non-JSON).");
      }

      if (!res.ok) {
        throw new Error(data.error || "Gagal berkomunikasi dengan Tevi AI service.");
      }

      const assistantMsg: ChatMessage = {
        id: `tevi-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const isFailedToFetch = err.message?.includes("Failed to fetch") || err.name === "TypeError";
      const errorMsg: ChatMessage = {
        id: `tevi-err-${Date.now()}`,
        role: "assistant",
        content: isFailedToFetch
          ? "⚠️ **[Koneksi Terputus / Failed to fetch]** Server sedang menginisialisasi atau koneksi sementara terputus. Silakan coba kirim ulang pesan dalam 2-3 detik."
          : `⚠️ [ERROR] Kendala teknis: ${err.message || "Unknown error"}. Anda tetap dapat menggunakan Terminal & Forensik Host secara mandiri.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Jump to terminal and execute
  const handleExecuteInTerminal = (cmd: string) => {
    setActiveTab("terminal");
    setStagedCommand(cmd);
    handleExecuteCommand(cmd);
  };

  // Send binary report directly to Tevi for assessment
  const handleSendBinaryToTevi = (report: BinaryReport) => {
    setActiveTab("chat");
    const prompt = `Lakukan analisis teknis menyeluruh (Reverse Engineering Assessment) terhadap biner target: **${report.filename}** (${report.format}, ${report.architecture}, ${report.bitness}). 
Periksa mitigasi keamanan (PIE, executable type), nilai hash SHA-256 (${report.hashes.sha256}), dan strings yang telah diekstraksi. Berikan kesimpulan berdasar **[TERVERIFIKASI]** vs **[HIPOTESIS]** serta langkah disassembly lanjutan.`;
    handleSendMessage(prompt);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-800 selection:text-white">
      <Header
        systemInfo={systemInfo}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLoadingInfo={isLoadingInfo}
        onRefreshInfo={fetchSystemInfo}
        reMode={reMode}
        setReMode={setReMode}
      />

      <main className="flex-1 overflow-hidden">
        {activeTab === "chat" && (
          <TeviChat
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            systemInfo={systemInfo}
            activeBinary={binaryReport}
            onExecuteInTerminal={handleExecuteInTerminal}
            onClearHistory={() => setChatMessages([])}
            reMode={reMode}
          />
        )}

        {activeTab === "terminal" && (
          <TerminalView
            logs={terminalLogs}
            onExecute={handleExecuteCommand}
            isExecuting={isExecuting}
            onClearLogs={() => setTerminalLogs([])}
            initialCommand={stagedCommand}
          />
        )}

        {activeTab === "binary" && (
          <BinaryLab
            binaryReport={binaryReport}
            onInspectFile={handleInspectFile}
            onInspectSystemPath={handleInspectSystemPath}
            isAnalyzing={isAnalyzingBinary}
            onSendToTevi={handleSendBinaryToTevi}
          />
        )}

        {activeTab === "api" && <ApiAnalyzer />}

        {activeTab === "tools" && (
          <ToolDiscovery
            tools={systemInfo?.tools || []}
            onExecuteInTerminal={handleExecuteInTerminal}
          />
        )}
      </main>
    </div>
  );
}
