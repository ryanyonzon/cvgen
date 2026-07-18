/**
 * Typed error classes for cvgen.
 *
 * Every error in the application should use one of these typed errors
 * to provide clear, actionable error messages with meaningful exit codes.
 */

/**
 * Base error class for all cvgen errors.
 */
export abstract class cvgenError extends Error {
  /** System exit code */
  public abstract readonly exitCode: number;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }

  /** Returns a user-friendly error message. */
  public abstract format(): string;
}

/**
 * Configuration errors: missing API key, invalid config file, etc.
 */
export class ConfigurationError extends cvgenError {
  public readonly exitCode = 1;

  public format(): string {
    return `Configuration Error: ${this.message}`;
  }
}

/**
 * Validation errors: invalid profile, invalid schema, etc.
 */
export class ValidationError extends cvgenError {
  public readonly exitCode = 2;

  constructor(
    message: string,
    public readonly field?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }

  public format(): string {
    if (this.field) {
      return `Validation Error (${this.field}): ${this.message}`;
    }
    return `Validation Error: ${this.message}`;
  }
}

/**
 * Provider errors: authentication, rate limits, API failures, etc.
 */
export class ProviderError extends cvgenError {
  public readonly exitCode = 3;

  constructor(
    message: string,
    public readonly provider?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }

  public format(): string {
    if (this.provider) {
      return `Provider Error [${this.provider}]: ${this.message}`;
    }
    return `Provider Error: ${this.message}`;
  }
}

/**
 * Rendering errors: template not found, render failure, etc.
 */
export class RenderingError extends cvgenError {
  public readonly exitCode = 4;

  public format(): string {
    return `Rendering Error: ${this.message}`;
  }
}

/**
 * Parsing errors: unsupported format, malformed input, etc.
 */
export class ParsingError extends cvgenError {
  public readonly exitCode = 5;

  public format(): string {
    return `Parsing Error: ${this.message}`;
  }
}

/**
 * IO errors: file not found, permission denied, etc.
 */
export class IOError extends cvgenError {
  public readonly exitCode = 6;

  public format(): string {
    return `IO Error: ${this.message}`;
  }
}

/**
 * Internal errors: unexpected exceptions, invariant violations, etc.
 */
export class InternalError extends cvgenError {
  public readonly exitCode = 7;

  public format(): string {
    return `Internal Error: ${this.message}`;
  }
}

/**
 * Error codes mapped to descriptions for user-facing output.
 */
export const ERROR_CODES: Record<number, string> = {
  1: "Configuration error",
  2: "Validation error",
  3: "Provider error",
  4: "Rendering error",
  5: "Parsing error",
  6: "I/O error",
  7: "Internal error",
};
