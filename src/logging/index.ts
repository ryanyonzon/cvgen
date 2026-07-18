/**
 * Logging framework for cvgen.
 *
 * Supports normal, verbose, and debug logging levels.
 * Never logs API keys or personal profile data by default.
 */

import fs from "node:fs";
import path from "node:path";
import type { LogLevel } from "../types/index.js";

/**
 * Logger configuration.
 */
export interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
  noColor?: boolean;
  /** Optional path to a log file for persistent logging */
  logFile?: string;
}

/**
 * ANSI color codes for log output.
 */
const Colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
} as const;

/**
 * Structured logger for the cvgen application.
 */
export class Logger {
  private readonly level: LogLevel;
  private readonly prefix: string;
  private readonly noColor: boolean;
  private readonly logFile: string | null;
  private logStream: fs.WriteStream | null = null;

  constructor(options: LoggerOptions) {
    this.level = options.level;
    this.prefix = options.prefix ?? "cvgen";
    this.noColor = options.noColor ?? false;
    this.logFile = options.logFile ?? null;

    if (this.logFile) {
      try {
        const dir = path.dirname(this.logFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        this.logStream = fs.createWriteStream(this.logFile, { flags: "a" });
      } catch {
        // File logging is best-effort
        this.logStream = null;
      }
    }
  }

  private colorize(text: string, color: string): string {
    if (this.noColor) {
      return text;
    }
    return `${color}${text}${Colors.reset}`;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["normal", "verbose", "debug"];
    return levels.indexOf(level) <= levels.indexOf(this.level);
  }

  private formatMessage(level: string, message: string): string {
    const prefix = this.colorize(`[${this.prefix}]`, Colors.dim);
    const levelTag = this.colorize(`[${level.toUpperCase()}]`, Colors.cyan);
    return `${prefix} ${levelTag} ${message}`;
  }

  /**
   * Write a log entry to the log file (if configured).
   * Sensitive data should be masked before calling this.
   */
  private writeToFile(level: string, message: string): void {
    if (!this.logStream) return;
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    try {
      this.logStream.write(line);
    } catch {
      // File logging is best-effort
    }
  }

  /**
   * Log a normal (user-facing) message.
   */
  public info(message: string): void {
    if (!this.shouldLog("normal")) return;
    console.log(this.formatMessage("info", message));
    this.writeToFile("info", message);
  }

  /**
   * Log a success message (green).
   */
  public success(message: string): void {
    if (!this.shouldLog("normal")) return;
    const colored = this.colorize(message, Colors.green);
    console.log(this.formatMessage("ok", colored));
    this.writeToFile("ok", message);
  }

  /**
   * Log a warning message (yellow).
   */
  public warn(message: string): void {
    if (!this.shouldLog("normal")) return;
    const colored = this.colorize(message, Colors.yellow);
    console.warn(this.formatMessage("warn", colored));
    this.writeToFile("warn", message);
  }

  /**
   * Log an error message (red).
   */
  public error(message: string): void {
    if (!this.shouldLog("normal")) return;
    const colored = this.colorize(message, Colors.red);
    console.error(this.formatMessage("error", colored));
    this.writeToFile("error", message);
  }

  /**
   * Log a verbose (informational) message.
   * Only shown when log level is "verbose" or "debug".
   */
  public verbose(message: string): void {
    if (!this.shouldLog("verbose")) return;
    const colored = this.colorize(message, Colors.blue);
    console.log(this.formatMessage("verbose", colored));
    this.writeToFile("verbose", message);
  }

  /**
   * Log a debug message.
   * Only shown when log level is "debug".
   */
  public debug(message: string): void {
    if (!this.shouldLog("debug")) return;
    console.log(this.formatMessage("debug", message));
    this.writeToFile("debug", message);
  }

  /**
   * Log a debug message with sensitive data masked.
   * Use this for logging API keys, tokens, or personal data.
   * Only shown when log level is "debug".
   */
  public debugMasked(label: string, value: string): void {
    if (!this.shouldLog("debug")) return;
    const masked =
      value.length > 8
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : "****";
    console.log(this.formatMessage("debug", `${label}: ${masked}`));
    this.writeToFile("debug", `${label}: [MASKED]`);
  }

  /**
   * Log a step message for pipeline progress.
   * Example: "[1/8] Loading profile"
   */
  public step(current: number, total: number, message: string): void {
    if (!this.shouldLog("normal")) return;
    const step = this.colorize(`[${current}/${total}]`, Colors.dim);
    console.log(`${step} ${message}`);
  }

  /**
   * Set or update the log file path after logger creation.
   *
   * @param filePath - Path to the log file
   */
  public setLogFile(filePath: string): void {
    // Close existing stream if any
    if (this.logStream) {
      try {
        this.logStream.end();
      } catch {
        /* ignore */
      }
    }
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.logStream = fs.createWriteStream(filePath, { flags: "a" });
    } catch {
      this.logStream = null;
    }
  }
}

/**
 * Create a default logger instance.
 *
 * @param level - Logging level (normal, verbose, debug)
 * @param noColor - Whether to disable colored output
 * @param logFile - Optional path to a log file for persistent logging
 */
export function createLogger(
  level: LogLevel = "normal",
  noColor = false,
  logFile?: string,
): Logger {
  return new Logger({ level, noColor, logFile });
}
