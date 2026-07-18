import { describe, it, expect } from "vitest";
import {
  ConfigurationError,
  ValidationError,
  ProviderError,
  RenderingError,
  ParsingError,
  IOError,
  InternalError,
  ERROR_CODES,
} from "../src/errors/index.js";

describe("cvgenError", () => {
  it("should set the name to the constructor name", () => {
    const error = new ConfigurationError("test");
    expect(error.name).toBe("ConfigurationError");
  });
});

describe("ConfigurationError", () => {
  it("should have exit code 1", () => {
    const error = new ConfigurationError("test");
    expect(error.exitCode).toBe(1);
  });

  it("should format the error message", () => {
    const error = new ConfigurationError("Missing API key");
    expect(error.format()).toBe("Configuration Error: Missing API key");
  });
});

describe("ValidationError", () => {
  it("should have exit code 2", () => {
    const error = new ValidationError("test");
    expect(error.exitCode).toBe(2);
  });

  it("should format without field", () => {
    const error = new ValidationError("Invalid email");
    expect(error.format()).toBe("Validation Error: Invalid email");
  });

  it("should format with field", () => {
    const error = new ValidationError("Invalid email", "contact.email");
    expect(error.format()).toBe(
      "Validation Error (contact.email): Invalid email",
    );
  });
});

describe("ProviderError", () => {
  it("should have exit code 3", () => {
    const error = new ProviderError("test");
    expect(error.exitCode).toBe(3);
  });

  it("should format without provider", () => {
    const error = new ProviderError("Rate limited");
    expect(error.format()).toBe("Provider Error: Rate limited");
  });

  it("should format with provider", () => {
    const error = new ProviderError("Rate limited", "OpenRouter");
    expect(error.format()).toBe("Provider Error [OpenRouter]: Rate limited");
  });
});

describe("RenderingError", () => {
  it("should have exit code 4", () => {
    const error = new RenderingError("test");
    expect(error.exitCode).toBe(4);
  });

  it("should format the error message", () => {
    const error = new RenderingError("Template not found");
    expect(error.format()).toBe("Rendering Error: Template not found");
  });
});

describe("ParsingError", () => {
  it("should have exit code 5", () => {
    const error = new ParsingError("test");
    expect(error.exitCode).toBe(5);
  });

  it("should format the error message", () => {
    const error = new ParsingError("Unsupported format");
    expect(error.format()).toBe("Parsing Error: Unsupported format");
  });
});

describe("IOError", () => {
  it("should have exit code 6", () => {
    const error = new IOError("test");
    expect(error.exitCode).toBe(6);
  });

  it("should format the error message", () => {
    const error = new IOError("File not found");
    expect(error.format()).toBe("IO Error: File not found");
  });
});

describe("InternalError", () => {
  it("should have exit code 7", () => {
    const error = new InternalError("test");
    expect(error.exitCode).toBe(7);
  });

  it("should format the error message", () => {
    const error = new InternalError("Unexpected state");
    expect(error.format()).toBe("Internal Error: Unexpected state");
  });
});

describe("ERROR_CODES", () => {
  it("should map all exit codes to descriptions", () => {
    expect(ERROR_CODES[1]).toBe("Configuration error");
    expect(ERROR_CODES[2]).toBe("Validation error");
    expect(ERROR_CODES[3]).toBe("Provider error");
    expect(ERROR_CODES[4]).toBe("Rendering error");
    expect(ERROR_CODES[5]).toBe("Parsing error");
    expect(ERROR_CODES[6]).toBe("I/O error");
    expect(ERROR_CODES[7]).toBe("Internal error");
  });
});
