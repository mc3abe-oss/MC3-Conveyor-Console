/**
 * Structured Logger — lightweight JSON logger for server and browser.
 *
 * - Development: pretty-printed for terminal readability
 * - Production: raw JSON, one line per entry
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  environment: string;
  [key: string]: unknown;
}

type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',  // gray
  info: '\x1b[36m',   // cyan
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
};
const RESET = '\x1b[0m';

function buildEntry(
  level: LogLevel,
  message: string,
  parentContext: LogContext,
  callContext?: LogContext,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.NODE_ENV || 'development',
    ...parentContext,
    ...callContext,
  };
}

function emit(entry: LogEntry): void {
  const isProd = process.env.NODE_ENV === 'production';
  const consoleFn =
    entry.level === 'error'
      ? console.error
      : entry.level === 'warn'
        ? console.warn
        : console.log;

  if (isProd) {
    consoleFn(JSON.stringify(entry));
  } else {
    const color = LEVEL_COLORS[entry.level];
    const { timestamp, level, message, environment, ...rest } = entry;
    const ctx = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
    consoleFn(
      `${color}[${level.toUpperCase()}]${RESET} ${timestamp} — ${message}${ctx}`,
    );
  }
}

function makeLogger(parentContext: LogContext): Logger {
  function log(level: LogLevel, message: string, context?: LogContext): void {
    emit(buildEntry(level, message, parentContext, context));
  }

  return {
    debug: (message, context?) => log('debug', message, context),
    info: (message, context?) => log('info', message, context),
    warn: (message, context?) => log('warn', message, context),
    error: (message, context?) => log('error', message, context),
    child(context: LogContext): Logger {
      return makeLogger({ ...parentContext, ...context });
    },
  };
}

export function createLogger(context?: LogContext): Logger {
  return makeLogger(context ?? {});
}
