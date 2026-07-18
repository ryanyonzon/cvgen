import { describe, it, expect, vi } from "vitest";
import { Logger, createLogger } from "../src/logging/index.js";

describe("Logger", () => {
  it("should create a logger with default options", () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(Logger);
  });

  it("should create a logger with custom level", () => {
    const logger = createLogger("debug");
    expect(logger).toBeInstanceOf(Logger);
  });

  it("should create a logger with noColor", () => {
    const logger = createLogger("normal", true);
    expect(logger).toBeInstanceOf(Logger);
  });

  it("should log info messages", () => {
    const logger = createLogger("normal", true);
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.info("test message");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should log success messages", () => {
    const logger = createLogger("normal", true);
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.success("test message");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should log warning messages", () => {
    const logger = createLogger("normal", true);
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logger.warn("test message");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should log error messages", () => {
    const logger = createLogger("normal", true);
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.error("test message");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should not log verbose messages at normal level", () => {
    const logger = createLogger("normal", true);
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.verbose("test message");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should log verbose messages at verbose level", () => {
    const logger = createLogger("verbose", true);
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.verbose("test message");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should not log debug messages at verbose level", () => {
    const logger = createLogger("verbose", true);
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.debug("test message");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should log debug messages at debug level", () => {
    const logger = createLogger("debug", true);
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.debug("test message");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should log step messages", () => {
    const logger = createLogger("normal", true);
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.step(1, 8, "Loading profile");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
