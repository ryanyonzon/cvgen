/**
 * Type definitions for job description parsing.
 */

/**
 * Normalized job description structure.
 *
 * Every parser converts its input into this common schema.
 * Downstream components (keyword extraction, ranking, etc.)
 * depend only on this structure, never on the original format.
 */
export interface ParsedJob {
  /** Job title as extracted from the description */
  title: string;
  /** Company name (if present) */
  company?: string;
  /** Job location (if present) */
  location?: string;
  /** Employment type (e.g., "Full-time", "Contract", "Remote") */
  employmentType?: string;
  /** Full job description text content */
  content: string;
}

/**
 * Result of a parsing operation.
 * Either succeeds with data or fails with an error message.
 */
export interface ParserResult {
  success: boolean;
  data?: ParsedJob;
  error?: string;
}

/**
 * Options passed to a parser's parseContent method.
 */
export interface ParserOptions {
  /** Original file path (for binary parsers that need to re-read) */
  filePath?: string;
  /** URL the content was fetched from */
  url?: string;
}

/**
 * Source type detection result.
 */
export interface SourceInfo {
  /** The type of source detected */
  type: "file" | "url" | "stdin" | "raw";
  /** The parser type to use (e.g., "markdown", "pdf", "url") */
  parserType: string;
  /** The raw source string */
  source: string;
}

/**
 * Job parser interface.
 *
 * Every format-specific parser implements this interface so that
 * the main parser module can treat them uniformly.
 */
export interface JobParser {
  /** Human-readable parser name */
  readonly name: string;
  /** File extensions this parser supports (e.g., [".md", ".markdown"]) */
  readonly supportedExtensions: string[];
  /** Whether this parser supports a given file extension */
  supportsExtension(ext: string): boolean;
  /**
   * Parse content into a normalized ParsedJob.
   *
   * @param content - The content to parse (string for text-based formats)
   * @param options - Optional context (filePath for binary formats)
   */
  parseContent(content: string, options?: ParserOptions): Promise<ParsedJob>;
}
