#!/usr/bin/env node

/**
 * cvgen - AI-powered CLI for generating professional, ATS-friendly
 * resumes and cover letters.
 *
 * Entry point for the CLI application.
 */

import { createLogger } from "./logging/index.js";
import { loadConfig, loadEnvironment, getConfigDir } from "./config/index.js";
import { createCommandRegistry, dispatch } from "./commands/index.js";
import { cvgenError } from "./errors/index.js";
import type { CommandContext } from "./commands/types.js";
import path from "node:path";

/**
 * Parse global CLI flags and extract the relevant context.
 */
function parseGlobalFlags(args: string[]): {
  remainingArgs: string[];
  verbose: boolean;
  debug: boolean;
  noColor: boolean;
} {
  let verbose = false;
  let debug = false;
  let noColor = false;
  const remainingArgs: string[] = [];

  for (const arg of args) {
    switch (arg) {
      case "--verbose":
        verbose = true;
        break;
      case "--debug":
        debug = true;
        break;
      case "--no-color":
        noColor = true;
        break;
      default:
        remainingArgs.push(arg);
    }
  }

  return { remainingArgs, verbose, debug, noColor };
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse global flags
  const { remainingArgs, verbose, debug, noColor } = parseGlobalFlags(args);

  // Determine log level
  const logLevel = debug ? "debug" : verbose ? "verbose" : "normal";

  // Create logger (initially without log file)
  const logger = createLogger(logLevel, noColor);

  try {
    // Load configuration
    const config = loadConfig();
    const environment = loadEnvironment();

    // Set up file logging if enabled
    if (config.logging) {
      const logFile = path.join(getConfigDir(), "logs", "cvgen.log");
      logger.setLogFile(logFile);
    }

    // Log startup info in verbose mode
    logger.verbose(`Starting cvgen v1.0.0`);
    logger.verbose(`Provider: ${environment.provider}`);
    logger.verbose(`Model: ${environment.model}`);
    logger.verbose(`Log level: ${logLevel}`);

    // Create command registry
    const registry = createCommandRegistry();

    // Build context
    const context: CommandContext = {
      logger,
      config,
      environment,
      verbose,
      debug,
      noColor,
    };

    // Dispatch to the appropriate command
    const result = await dispatch(remainingArgs, registry, context);

    if (!result.success) {
      process.exit(result.exitCode ?? 1);
    }
  } catch (error) {
    if (error instanceof cvgenError) {
      logger.error(error.format());
      if (debug) {
        console.error(error);
      }
      process.exit(error.exitCode);
    }

    if (error instanceof Error) {
      logger.error(`Unexpected error: ${error.message}`);
      if (debug) {
        console.error(error);
      }
    } else {
      logger.error("An unexpected error occurred.");
    }

    process.exit(1);
  }
}

// Run the application
main();
