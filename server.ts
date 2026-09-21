import express from "express";
import path from "path";
import { exec } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable CORS and Preflight handling for dev/preview iframe environments
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper: Safely run system commands
function runShellCommand(cmd: string, timeoutMs: number = 8000): Promise<{ stdout: string; stderr: string; exitCode: number; executionTimeMs: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    // Check blacklist for dangerous destructive commands
    const forbiddenPatterns = [
      /\brm\s+-[rf]{1,2}\s+\//i,
      /\bmkfs\b/i,
      /\bdd\s+if=.*of=\/dev\/(sd|nvme|hd|vd)/i,
      /:\(\)\s*\{\s*:\|:&\s*\};\s*:/, // fork bomb
      />\s*\/dev\/(sd|nvme|hd|vd)/i,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(cmd)) {
        return resolve({
          stdout: "",
          stderr: "[SAFETY BLOCK] Command ini diblokir oleh Safety Guardrail Tevi demi mencegah kerusakan sistem.",
          exitCode: 126,
          executionTimeMs: Date.now() - startTime,
        });
      }
    }

    exec(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
      const executionTimeMs = Date.now() - startTime;
      resolve({
        stdout: stdout || "",
        stderr: stderr || (error && error.message ? error.message : ""),
        exitCode: error && error.code !== undefined ? error.code : 0,
        executionTimeMs,
      });
    });
  });
}

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    service: "Tevi Personal Server & Reverse Engineering Assistant",
    timestamp: new Date().toISOString(),
  });
});

// 2. System info & tool discovery
app.get("/api/system/info", async (_req, res) => {
  try {
    const hostname = os.hostname();
    const platform = os.platform();
    const release = os.release();
    const arch = os.arch();
    const uptime = os.uptime();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const userInfo = os.userInfo();

    // Tool discovery list
    const toolsToCheck = [
      "file", "strings", "readelf", "objdump", "nm", "ldd", "strace", "ltrace",
      "gdb", "radare2", "rizin", "xxd", "hexdump", "grep", "sed", "awk", "find",
      "curl", "wget", "git", "python3", "python", "node", "npm", "go", "gcc", "make", "docker"
    ];

    const toolScanPromises = toolsToCheck.map(async (tool) => {
      const check = await runShellCommand(`which ${tool}`);
      const isAvailable = check.exitCode === 0 && check.stdout.trim().length > 0;
      let version = "";
      if (isAvailable) {
        // Quick version check
        const vCheck = await runShellCommand(`${tool} --version || ${tool} -v || ${tool} -V`, 2000);
        const firstLine = (vCheck.stdout || vCheck.stderr).split("\n")[0]?.trim() || "";
        version = firstLine.slice(0, 60);
      }
      return {
        name: tool,
        available: isAvailable,
        path: isAvailable ? check.stdout.trim() : null,
        version: version || (isAvailable ? "Available" : "Not found"),
      };
    });

    const discoveredTools = await Promise.all(toolScanPromises);

    // Get basic OS release info if on Linux
    let osReleaseInfo = `${platform} ${release}`;
    try {
      if (fs.existsSync("/etc/os-release")) {
        const osData = fs.readFileSync("/etc/os-release", "utf-8");
        const prettyNameMatch = osData.match(/PRETTY_NAME="?([^"\n]+)"?/);
        if (prettyNameMatch) {
          osReleaseInfo = prettyNameMatch[1];
        }
      }
    } catch {
      // fallback
    }

    res.json({
      hostname,
      platform,
      release,
      osReleaseInfo,
      arch,
      uptimeSeconds: uptime,
      memory: {
        totalBytes: totalMem,
        freeBytes: freeMem,
        usedBytes: totalMem - freeMem,
        usedPercentage: Math.round(((totalMem - freeMem) / totalMem) * 100),
      },
      cpu: {
        model: cpus[0]?.model || "Unknown CPU",
        cores: cpus.length,
        loadAvg,
      },
      user: {
        username: userInfo.username,
        uid: userInfo.uid,
        gid: userInfo.gid,
        homedir: userInfo.homedir,
      },
      tools: discoveredTools,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 3. Command execution endpoint (Execution-First Policy)
app.post("/api/system/exec", async (req, res) => {
  try {
    const { command } = req.body;
    if (!command || typeof command !== "string") {
      return res.status(400).json({ error: "Parameter 'command' diperlukan." });
    }

    const trimmed = command.trim();
    if (!trimmed) {
      return res.status(400).json({ error: "Command tidak boleh kosong." });
    }

    const result = await runShellCommand(trimmed, 15000);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 4. Binary & Reverse Engineering inspection
app.post("/api/re/inspect-binary", async (req, res) => {
  try {
    const { base64Data, filename, systemPath } = req.body;
    let buffer: Buffer;
    let targetName = filename || "target.bin";

    if (systemPath) {
      if (!fs.existsSync(systemPath)) {
        return res.status(404).json({ error: `File ${systemPath} tidak ditemukan di sistem.` });
      }
      buffer = fs.readFileSync(systemPath);
      targetName = path.basename(systemPath);
    } else if (base64Data) {
      buffer = Buffer.from(base64Data, "base64");
    } else {
      return res.status(400).json({ error: "Parameter 'base64Data' atau 'systemPath' diperlukan." });
    }

    const fileSize = buffer.length;

    // 1. Hashes
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const md5 = crypto.createHash("md5").update(buffer).digest("hex");
    const sha1 = crypto.createHash("sha1").update(buffer).digest("hex");

    // 2. Magic byte detection
    let format = "Unknown Binary / Data";
    let architecture = "Unknown";
    let endianness = "Unknown";
    let bitness = "Unknown";
    let elfDetails: any = null;

    if (buffer.length >= 4) {
      const magicHex = buffer.subarray(0, 4).toString("hex");

      if (magicHex === "7f454c46") {
        // ELF binary
        format = "ELF Executable / Library";
        const elfClass = buffer[4]; // 1: 32-bit, 2: 64-bit
        bitness = elfClass === 2 ? "64-bit" : elfClass === 1 ? "32-bit" : "Unknown";
        const elfData = buffer[5]; // 1: Little Endian, 2: Big Endian
        endianness = elfData === 1 ? "Little Endian (LSB)" : elfData === 2 ? "Big Endian (MSB)" : "Unknown";

        const isLittle = elfData === 1;
        const e_type = isLittle ? buffer.readUInt16LE(16) : buffer.readUInt16BE(16);
        const e_machine = isLittle ? buffer.readUInt16LE(18) : buffer.readUInt16BE(18);

        const typeMap: Record<number, string> = {
          1: "ET_REL (Relocatable file)",
          2: "ET_EXEC (Executable file)",
          3: "ET_DYN (Shared object / PIE Executable)",
          4: "ET_CORE (Core dump)",
        };

        const machineMap: Record<number, string> = {
          3: "x86 (Intel 80386)",
          62: "x86-64 (AMD x86-64)",
          40: "ARM",
          183: "AArch64 (ARM 64-bit)",
          8: "MIPS",
          243: "RISC-V",
        };

        architecture = machineMap[e_machine] || `Machine ID: ${e_machine}`;
        const entryPoint = elfClass === 2 
          ? (isLittle ? buffer.readBigUInt64LE?.(24)?.toString(16) : buffer.readBigUInt64BE?.(24)?.toString(16)) || "0x0"
          : (isLittle ? buffer.readUInt32LE(24).toString(16) : buffer.readUInt32BE(24).toString(16));

        elfDetails = {
          type: typeMap[e_type] || `Unknown (${e_type})`,
          machine: architecture,
          entryPoint: `0x${entryPoint}`,
          isPIE: e_type === 3,
        };
      } else if (buffer.subarray(0, 2).toString("ascii") === "MZ") {
        format = "PE (Portable Executable / Windows Binary)";
        architecture = "x86 / x86_64";
      } else if (magicHex === "cafebabe" || magicHex === "feedface" || magicHex === "feedfacf") {
        format = "Mach-O (macOS / iOS Binary)";
      } else if (magicHex === "504b0304") {
        format = filename?.endsWith(".apk") ? "Android Package (APK / ZIP)" : "ZIP Archive / Compressed Package";
      } else if (magicHex === "0061736d") {
        format = "WebAssembly (WASM Binary)";
      } else if (buffer.subarray(0, 2).toString("ascii") === "#!") {
        format = "Script Executable (Shebang)";
      }
    }

    // 3. String extraction
    const extractedStrings: { offset: number; text: string; category?: string }[] = [];
    const minStringLength = 4;
    let currentStr = "";
    let currentStart = 0;

    for (let i = 0; i < Math.min(buffer.length, 500000); i++) {
      const byte = buffer[i];
      // Printable ASCII: 32 (space) to 126 (~), plus tab
      if ((byte >= 32 && byte <= 126) || byte === 9) {
        if (currentStr.length === 0) currentStart = i;
        currentStr += String.fromCharCode(byte);
      } else {
        if (currentStr.length >= minStringLength) {
          let category = "general";
          if (currentStr.startsWith("http://") || currentStr.startsWith("https://")) {
            category = "network";
          } else if (currentStr.startsWith("/") || currentStr.startsWith("./") || currentStr.includes("\\")) {
            category = "path";
          } else if (/^[A-Za-z0-9+/]{24,}={0,2}$/.test(currentStr)) {
            category = "base64";
          } else if (/\b(password|secret|token|apikey|key|admin|root)\b/i.test(currentStr)) {
            category = "security";
          } else if (currentStr.includes("@") && currentStr.includes(".")) {
            category = "credential";
          }

          extractedStrings.push({
            offset: currentStart,
            text: currentStr,
            category,
          });
        }
        currentStr = "";
      }
      if (extractedStrings.length >= 800) break; // Limit for response size
    }

    // 4. Hex dump generation (first 1024 bytes)
    const hexSliceLength = Math.min(buffer.length, 1024);
    const hexRows: { offsetHex: string; hexPairs: string[]; ascii: string }[] = [];
    for (let i = 0; i < hexSliceLength; i += 16) {
      const chunk = buffer.subarray(i, Math.min(i + 16, hexSliceLength));
      const hexPairs: string[] = [];
      let ascii = "";
      for (let j = 0; j < 16; j++) {
        if (j < chunk.length) {
          const byte = chunk[j];
          hexPairs.push(byte.toString(16).padStart(2, "0").toUpperCase());
          ascii += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
        } else {
          hexPairs.push("  ");
          ascii += " ";
        }
      }
      hexRows.push({
        offsetHex: i.toString(16).padStart(8, "0").toUpperCase(),
        hexPairs,
        ascii,
      });
    }

    // 5. Run native `file` and `readelf` if available via temp file
    let nativeFileOutput = "";
    let readelfOutput = "";
    try {
      const tempPath = path.join(os.tmpdir(), `tevi_re_${Date.now()}_${path.basename(targetName)}`);
      fs.writeFileSync(tempPath, buffer);

      const fileResult = await runShellCommand(`file "${tempPath}"`, 3000);
      if (fileResult.exitCode === 0) {
        nativeFileOutput = fileResult.stdout.replace(tempPath, targetName).trim();
      }

      if (format.startsWith("ELF")) {
        const elfResult = await runShellCommand(`readelf -h "${tempPath}"`, 3000);
        if (elfResult.exitCode === 0) {
          readelfOutput = elfResult.stdout;
        }
      }

      // Cleanup
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    } catch {}

    res.json({
      filename: targetName,
      fileSize,
      hashes: {
        sha256,
        md5,
        sha1,
      },
      format,
      architecture,
      bitness,
      endianness,
      elfDetails,
      nativeFileReport: nativeFileOutput,
      readelfHeader: readelfOutput,
      totalStringsFound: extractedStrings.length,
      sampleStrings: extractedStrings,
      hexDump: hexRows,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 5. API / Web Request Inspector endpoint
app.post("/api/api-analyzer", async (req, res) => {
  const startTime = Date.now();
  try {
    const { url, method = "GET", headers = {}, body = null } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Parameter 'url' diperlukan." });
    }

    let targetUrl = url.trim();
    if (targetUrl.startsWith("/")) {
      targetUrl = `http://localhost:${PORT}${targetUrl}`;
    } else if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `http://${targetUrl}`;
    }

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        "User-Agent": "Tevi-SecurityLab/1.0",
        ...headers,
      },
    };

    if (["POST", "PUT", "PATCH"].includes(method.toUpperCase()) && body) {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      if (!fetchOptions.headers || !(fetchOptions.headers as any)["Content-Type"]) {
        (fetchOptions.headers as any)["Content-Type"] = "application/json";
      }
    }

    try {
      const response = await fetch(targetUrl, fetchOptions);
      const latencyMs = Date.now() - startTime;
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const responseText = await response.text();
      let parsedJson = null;
      try {
        parsedJson = JSON.parse(responseText);
      } catch {}

      // Security header assessment
      const securityHeaders = {
        hsts: responseHeaders["strict-transport-security"] || "Tidak terpasang",
        contentSecurityPolicy: responseHeaders["content-security-policy"] || "Tidak terpasang",
        xFrameOptions: responseHeaders["x-frame-options"] || "Tidak terpasang",
        xContentTypeOptions: responseHeaders["x-content-type-options"] || "Tidak terpasang",
        cors: responseHeaders["access-control-allow-origin"] || "Tidak ada header CORS publik",
        serverHeader: responseHeaders["server"] || "Hidden / Tidak ada",
      };

      res.json({
        status: response.status,
        statusText: response.statusText,
        url: response.url || targetUrl,
        latencyMs,
        headers: responseHeaders,
        securityHeaders,
        bodyText: responseText.slice(0, 10000), // Cap at 10KB
        isJson: parsedJson !== null,
        jsonData: parsedJson,
      });
    } catch (fetchErr: any) {
      const latencyMs = Date.now() - startTime;
      res.json({
        status: 0,
        statusText: "Connection / Network Error",
        url: targetUrl,
        latencyMs,
        headers: {},
        securityHeaders: {
          hsts: "N/A",
          contentSecurityPolicy: "N/A",
          xFrameOptions: "N/A",
          xContentTypeOptions: "N/A",
          cors: "N/A",
          serverHeader: "N/A",
        },
        bodyText: `[NETWORK ERROR] Gagal menghubungi target (${targetUrl}): ${fetchErr.message || "Connection refused or unreachable"}`,
        isJson: false,
        jsonData: null,
      });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 6. Tevi AI Chat endpoint with Gemini (@google/genai)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, activeContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Parameter 'messages' harus berupa array." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        reply: "Halo! Saya **Tevi**, Personal Server & Reverse Engineering Assistant Anda.\n\n⚠️ **Catatan Kunci API:** `GEMINI_API_KEY` belum terkonfigurasi di server environment ini. Namun Anda tetap dapat menggunakan seluruh alat diagnostik langsung di workstation ini:\n- **Terminal Eksekusi Server Forensik** (`uname -a`, `ps aux`, `ss -lntup`, dll.)\n- **Laboratorium Analisis Biner & Reverse Engineering** (ELF, Hex dump, String extraction)\n- **API & Protocol Analyzer**\n\nUntuk mengaktifkan kemampuan analitis AI percakapan penuh, silakan tambahkan `GEMINI_API_KEY` Anda di menu Secrets platform.",
        isFallback: true,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
Kamu adalah Tevi.
Identitas: Asisten pribadi yang ramah, teknis, proaktif, dan berorientasi pada penyelesaian masalah.
Bahasa: Berkomunikasi dalam Bahasa Indonesia secara konsisten (kecuali pengguna meminta bahasa lain).
Lingkungan: Berjalan di lingkungan server, Linux host, container, VM, atau workstation teknis.

Fokus Utama:
1. Administrasi server & troubleshooting Linux.
2. Forensik server & sistem (mengikuti checklist bertahap: uname -a, cat /etc/os-release, id, uptime, df -h, free -h, nproc, ps aux, ss -lntup, ip addr, ip route).
3. Reverse engineering mode: Analisis ELF, PE, APK, firmware, shared library, xxd/hexdump, strings, readelf, symbols, headers, mitigasi keamanan.
4. API & Protocol analysis: endpoint, HTTP methods, headers, CORS, status codes, sanitasi, auth token verification.
5. Lab malware analysis & security research dalam lingkungan berizin.

Prinsip Eksekusi:
- **EXECUTION-FIRST POLICY**: Jika ada pemeriksaan teknis, utamakan fakta yang terverifikasi.
- **ANTI-HALLUCINATION**:
  - Selalu bedakan dengan jelas antara fakta: **[TERVERIFIKASI]** dan hipotesis: **[HIPOTESIS]**.
  - Jangan pernah mengatakan "Sudah saya cek" jika belum memeriksa output sebenarnya.
  - Jangan mengarang hasil command. Jika bukti belum cukup, nyatakan dengan jujur: "Belum dapat diverifikasi."
- **COMMAND SAFETY**: Hindari instruksi destruktif (rm -rf, format disk, firewall flush tanpa konfirmasi). Utamakan read-only inspection.
- **STYLE**: Ramah, padat, sangat kompeten dan teknis, tidak bertele-tele, jelaskan tujuan command, berikan instruksi bertahap yang dapat langsung dijalankan.

Konteks Aktif Server/Lingkungan Saat Ini (jika ada):
${activeContext ? JSON.stringify(activeContext, null, 2) : "Belum ada output kontekstual spesifik."}
`;

    // Format chat history
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Model fallback cascade to handle 503 high-demand spikes
    const CANDIDATE_MODELS = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.3, // Lower temperature for technical precision and anti-hallucination
          },
        });
        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} encountered error (likely 503/high-demand), trying fallback:`, err?.message || err);
        // Continue to fallback model
      }
    }

    if (!response || !response.text) {
      const errMsg = lastError?.message || "";
      const is503HighDemand = errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE");
      
      if (is503HighDemand) {
        return res.json({
          reply: "⚠️ **[Layanan AI Mengalami Beban Tinggi / 503 Spikes]**\n\nModel AI sedang mengalami antrean trafik tinggi sesaat (*high demand spike*). Silakan klik tombol kirim atau ulangi pertanyaan Anda dalam beberapa saat.\n\n💡 *Fitur lokal tetap aktif:* Seluruh alat forensik di tab **Terminal & Forensik Host**, **Lab Analisis Biner & Hex**, dan **API Analyzer** berjalan secara lokal di host container dan tetap dapat Anda gunakan langsung.",
          isTransientHighDemand: true,
        });
      }

      throw lastError || new Error("Tidak ada respons yang dihasilkan oleh model AI.");
    }

    res.json({
      reply: response.text,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Tevi Server Assistant is active on port ${PORT}`);
  });
}

startServer();
