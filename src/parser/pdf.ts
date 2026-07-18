/**
 * PDF job description parser.
 *
 * Parses PDF files and extracts text content using pdf-parse.
 * Falls back to the text parser for metadata extraction after
 * extracting the raw text from the PDF.
 */

import { PDFParse } from "pdf-parse";
import type { ParsedJob, JobParser, ParserOptions } from "./types.js";
import { TextParser } from "./text.js";
import { ParsingError } from "../errors/index.js";
import fs from "node:fs";

/**
 * PDF parser for job descriptions.
 */
export class PDFParser implements JobParser {
  public readonly name = "pdf";
  public readonly supportedExtensions = [".pdf"];

  // Reuse text parser for metadata extraction from extracted text
  private readonly textParser = new TextParser();

  public supportsExtension(ext: string): boolean {
    return ext.toLowerCase() === ".pdf";
  }

  /**
   * Parse a PDF job description.
   *
   * @param content - Raw content string (not used for PDF; filePath must be provided)
   * @param options - Must include filePath pointing to the PDF file
   */
  public async parseContent(
    _content: string,
    options?: ParserOptions,
  ): Promise<ParsedJob> {
    if (!options?.filePath) {
      throw new ParsingError(
        "PDF parsing requires a file path. Provide the PDF file path as source.",
      );
    }

    const filePath = options.filePath;

    if (!fs.existsSync(filePath)) {
      throw new ParsingError(`PDF file not found: ${filePath}`);
    }

    let buffer: Buffer;
    try {
      buffer = fs.readFileSync(filePath);
    } catch (error) {
      throw new ParsingError(
        `Failed to read PDF file "${filePath}": ${(error as Error).message}`,
      );
    }

    // Extract text from PDF using pdf-parse
    let pdfText: string;
    try {
      const pdf = new PDFParse({ data: buffer, verbosity: 0 } as never);
      const result = await pdf.getText();
      pdfText = result.text;
    } catch (error) {
      throw new ParsingError(
        `Failed to parse PDF "${filePath}": ${(error as Error).message}`,
      );
    }

    if (!pdfText || pdfText.trim().length === 0) {
      throw new ParsingError(
        `No text content could be extracted from PDF "${filePath}"`,
      );
    }

    // Use text parser for metadata extraction
    const parsed = await this.textParser.parseContent(pdfText, options);

    return parsed;
  }
}
