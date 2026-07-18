/**
 * DOCX job description parser.
 *
 * Parses DOCX files and extracts text content using mammoth.
 * Falls back to the text parser for metadata extraction after
 * extracting the raw text from the DOCX.
 */

import mammoth from "mammoth";
import type { ParsedJob, JobParser, ParserOptions } from "./types.js";
import { TextParser } from "./text.js";
import { ParsingError } from "../errors/index.js";
import fs from "node:fs";

/**
 * DOCX parser for job descriptions.
 */
export class DocxParser implements JobParser {
  public readonly name = "docx";
  public readonly supportedExtensions = [".docx"];

  // Reuse text parser for metadata extraction from extracted text
  private readonly textParser = new TextParser();

  public supportsExtension(ext: string): boolean {
    return ext.toLowerCase() === ".docx";
  }

  /**
   * Parse a DOCX job description.
   *
   * @param _content - Not used; DOCX parsing requires a file path
   * @param options - Must include filePath pointing to the DOCX file
   */
  public async parseContent(
    _content: string,
    options?: ParserOptions,
  ): Promise<ParsedJob> {
    if (!options?.filePath) {
      throw new ParsingError(
        "DOCX parsing requires a file path. Provide the DOCX file path as source.",
      );
    }

    const filePath = options.filePath;

    if (!fs.existsSync(filePath)) {
      throw new ParsingError(`DOCX file not found: ${filePath}`);
    }

    let buffer: Buffer;
    try {
      buffer = fs.readFileSync(filePath);
    } catch (error) {
      throw new ParsingError(
        `Failed to read DOCX file "${filePath}": ${(error as Error).message}`,
      );
    }

    // Extract text from DOCX using mammoth
    let docxText: string;
    try {
      const result = await mammoth.extractRawText({ buffer });
      docxText = result.value;
    } catch (error) {
      throw new ParsingError(
        `Failed to parse DOCX "${filePath}": ${(error as Error).message}`,
      );
    }

    if (!docxText || docxText.trim().length === 0) {
      throw new ParsingError(
        `No text content could be extracted from DOCX "${filePath}"`,
      );
    }

    // Use text parser for metadata extraction
    const parsed = await this.textParser.parseContent(docxText, options);

    return parsed;
  }
}
