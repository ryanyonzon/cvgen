/**
 * Command interface for cvgen.
 *
 * Every CLI command implements this interface to ensure
 * consistent behavior across the application.
 */

import type { Logger } from "../logging/index.js";
import type { cvgenConfig, EnvironmentConfig } from "../types/index.js";

/**
 * Context passed to every command handler.
 */
export interface CommandContext {
  logger: Logger;
  config: cvgenConfig;
  environment: EnvironmentConfig;
  verbose: boolean;
  debug: boolean;
  noColor: boolean;
}

/**
 * Result returned by a command handler.
 */
export interface CommandResult {
  /** Human-readable result message */
  message: string;
  /** Whether the command succeeded */
  success: boolean;
  /** Optional exit code override */
  exitCode?: number;
}

/**
 * Base interface for all CLI commands.
 */
export interface Command {
  /** The command name used for dispatch */
  name: string;
  /** Short description for help text */
  description: string;
  /** Extended help text */
  help?: string;
  /** Execute the command */
  execute(args: string[], context: CommandContext): Promise<CommandResult>;
}

/**
 * Registry of available commands.
 */
export class CommandRegistry {
  private readonly commands: Map<string, Command> = new Map<string, Command>();

  /**
   * Register a command.
   */
  public register(command: Command): void {
    this.commands.set(command.name, command);
  }

  /**
   * Get a command by name.
   */
  public get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  /**
   * Get all registered commands.
   */
  public getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Check if a command is registered.
   */
  public has(name: string): boolean {
    return this.commands.has(name);
  }
}
