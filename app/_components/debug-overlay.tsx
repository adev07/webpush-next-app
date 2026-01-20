"use client";

import { useState, useEffect, useRef } from "react";

interface LogEntry {
  timestamp: string;
  type: "log" | "error" | "warn" | "info";
  message: string;
}

export function DebugOverlay() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const addLog = (type: LogEntry["type"], args: any[]) => {
      const message = args
        .map((arg) => {
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(" ");

      const entry: LogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
      };

      setLogs((prev) => [...prev.slice(-50), entry]); // Keep last 50 logs
    };

    // Override console methods
    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog("log", args);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog("error", args);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog("warn", args);
    };

    console.info = (...args) => {
      originalInfo.apply(console, args);
      addLog("info", args);
    };

    // Cleanup on unmount
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-zinc-800 text-white px-3 py-2 rounded-lg text-xs z-[9999] shadow-lg"
      >
        Show Logs
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-black/95 text-white z-[9999] transition-all ${
        isMinimized ? "h-10" : "h-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
        <span className="text-xs font-semibold">Debug Console ({logs.length})</span>
        <div className="flex gap-2">
          <button
            onClick={() => setLogs([])}
            className="text-xs bg-zinc-700 px-2 py-1 rounded hover:bg-zinc-600"
          >
            Clear
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-xs bg-zinc-700 px-2 py-1 rounded hover:bg-zinc-600"
          >
            {isMinimized ? "Expand" : "Minimize"}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-500"
          >
            Hide
          </button>
        </div>
      </div>

      {/* Logs */}
      {!isMinimized && (
        <div className="h-[calc(100%-40px)] overflow-y-auto p-2 text-xs font-mono">
          {logs.length === 0 ? (
            <p className="text-zinc-500">No logs yet...</p>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`py-1 border-b border-zinc-800 ${
                  log.type === "error"
                    ? "text-red-400"
                    : log.type === "warn"
                    ? "text-yellow-400"
                    : log.type === "info"
                    ? "text-blue-400"
                    : "text-green-400"
                }`}
              >
                <span className="text-zinc-500">[{log.timestamp}]</span>{" "}
                <span className="text-zinc-400">[{log.type.toUpperCase()}]</span>{" "}
                <span className="whitespace-pre-wrap break-all">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
