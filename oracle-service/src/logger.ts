import { config } from "./config";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const configLevel = (config.logLevel as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[configLevel];
}

function format(level: LogLevel, msg: string): string {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
}

export const log = {
  debug: (msg: string) => {
    if (shouldLog("debug")) console.debug(format("debug", msg));
  },
  info: (msg: string) => {
    if (shouldLog("info")) console.info(format("info", msg));
  },
  warn: (msg: string) => {
    if (shouldLog("warn")) console.warn(format("warn", msg));
  },
  error: (msg: string) => {
    if (shouldLog("error")) console.error(format("error", msg));
  },
};
