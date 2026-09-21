export interface SystemInfo {
  hostname: string;
  platform: string;
  release: string;
  osReleaseInfo: string;
  arch: string;
  uptimeSeconds: number;
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usedPercentage: number;
  };
  cpu: {
    model: string;
    cores: number;
    loadAvg: number[];
  };
  user: {
    username: string;
    uid: number;
    gid: number;
    homedir: string;
  };
  tools: ToolItem[];
}

export interface ToolItem {
  name: string;
  available: boolean;
  path: string | null;
  version: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  command?: string;
  timestamp?: string;
}

export interface BinaryReport {
  filename: string;
  fileSize: number;
  hashes: {
    sha256: string;
    md5: string;
    sha1: string;
  };
  format: string;
  architecture: string;
  bitness: string;
  endianness: string;
  elfDetails: {
    type: string;
    machine: string;
    entryPoint: string;
    isPIE: boolean;
  } | null;
  nativeFileReport: string;
  readelfHeader: string;
  totalStringsFound: number;
  sampleStrings: Array<{
    offset: number;
    text: string;
    category?: string;
  }>;
  hexDump: Array<{
    offsetHex: string;
    hexPairs: string[];
    ascii: string;
  }>;
}

export interface ApiResponseData {
  status: number;
  statusText: string;
  url: string;
  latencyMs: number;
  headers: Record<string, string>;
  securityHeaders: {
    hsts: string;
    contentSecurityPolicy: string;
    xFrameOptions: string;
    xContentTypeOptions: string;
    cors: string;
    serverHeader: string;
  };
  bodyText: string;
  isJson: boolean;
  jsonData: any;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  contextAttached?: string;
  isVerified?: boolean;
}
