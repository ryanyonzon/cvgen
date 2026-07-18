/**
 * Tests for the commands module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import type { CommandContext } from "../src/commands/types.js";
import type { Logger } from "../src/logging/index.js";

// Mock fs and os
vi.mock("node:fs");
vi.mock("node:os");

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
    step: vi.fn(),
  } as unknown as Logger;
}

function createMockContext(): CommandContext {
  return {
    logger: createMockLogger(),
    config: {
      defaultProfile: "default",
      defaultTemplate: "ats",
      defaultOutput: "stdout",
      temperature: 0.2,
      maxTokens: 8000,
      history: true,
      logging: true,
      promptVersion: "v1",
    },
    environment: {
      provider: "openrouter",
      model: "openai/gpt-4o",
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    },
    verbose: false,
    debug: false,
    noColor: true,
  };
}

async function getCommand(name: string) {
  const { createCommandRegistry } = await import("../src/commands/index.js");
  const registry = createCommandRegistry();
  const cmd = registry.get(name);
  expect(cmd).toBeDefined();
  return cmd as NonNullable<typeof cmd>;
}

describe("InitCommand", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize configuration when it does not exist", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    vi.mocked(fs.readFileSync).mockImplementation(() => "");

    const initCmd = await getCommand("init");
    const result = await initCmd.execute([], createMockContext());
    expect(result.success).toBe(true);
  });

  it("should warn when configuration already exists without --force", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      "default.json",
    ] as unknown as fs.Dirent[]);

    const initCmd = await getCommand("init");
    const context = createMockContext();
    const result = await initCmd.execute([], context);
    expect(result.success).toBe(false);
    expect(context.logger.warn).toHaveBeenCalled();
  });

  it("should initialize when only directory exists but no config files", async () => {
    // Simulate: configDir exists, but configFile and envFile do not
    vi.mocked(fs.existsSync).mockImplementation((p: string) => {
      return p.toString().includes(".config/cvgen") &&
        !p.toString().includes("config.json") &&
        !p.toString().includes(".env");
    });
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    vi.mocked(fs.readFileSync).mockImplementation(() => "");

    const initCmd = await getCommand("init");
    const context = createMockContext();
    const result = await initCmd.execute([], context);
    expect(result.success).toBe(true);
  });

  it("should require --force when config.json exists", async () => {
    // Simulate: config.json exists
    vi.mocked(fs.existsSync).mockImplementation((p: string) => {
      return p.toString().includes("config.json");
    });

    const initCmd = await getCommand("init");
    const context = createMockContext();
    const result = await initCmd.execute([], context);
    expect(result.success).toBe(false);
    expect(context.logger.warn).toHaveBeenCalled();
  });

  it("should require --force when .env exists", async () => {
    // Simulate: .env exists
    vi.mocked(fs.existsSync).mockImplementation((p: string) => {
      return p.toString().includes(".env");
    });

    const initCmd = await getCommand("init");
    const context = createMockContext();
    const result = await initCmd.execute([], context);
    expect(result.success).toBe(false);
    expect(context.logger.warn).toHaveBeenCalled();
  });

  it("should overwrite with --force even when config files exist", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    vi.mocked(fs.readFileSync).mockImplementation(() => "");

    const initCmd = await getCommand("init");
    const context = createMockContext();
    const result = await initCmd.execute(["--force"], context);
    expect(result.success).toBe(true);
  });
});

describe("ProfileCommand", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should list profiles", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      "default.json",
      "backend.json",
    ] as unknown as fs.Dirent[]);

    const profileCmd = await getCommand("profile");
    const result = await profileCmd.execute(["list"], createMockContext());
    expect(result.success).toBe(true);
  });

  it("should show profile details", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        name: "John Doe",
        contact: { email: "john@example.com" },
      }),
    );

    const profileCmd = await getCommand("profile");
    const result = await profileCmd.execute(
      ["show", "--name", "default"],
      createMockContext(),
    );
    expect(result.success).toBe(true);
  });

  it("should report error for unknown subcommand", async () => {
    const profileCmd = await getCommand("profile");
    const result = await profileCmd.execute(["unknown"], createMockContext());
    expect(result.success).toBe(false);
  });
});

describe("ConfigCommand", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should display current configuration", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        defaultProfile: "default",
        defaultTemplate: "ats",
        defaultOutput: "stdout",
        temperature: 0.2,
        maxTokens: 8000,
        history: true,
        logging: true,
        promptVersion: "v1",
      }),
    );

    const configCmd = await getCommand("config");
    const result = await configCmd.execute(["show"], createMockContext());
    expect(result.success).toBe(true);
  });

  it("should set default profile", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        defaultProfile: "default",
      }),
    );
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

    const configCmd = await getCommand("config");
    const context = createMockContext();
    const result = await configCmd.execute(
      ["profile", "--name", "backend"],
      context,
    );
    expect(result.success).toBe(true);
    expect(context.logger.success).toHaveBeenCalledWith(
      expect.stringContaining("backend"),
    );
  });

  it("should require profile name for profile subcommand", async () => {
    const configCmd = await getCommand("config");
    const result = await configCmd.execute(["profile"], createMockContext());
    expect(result.success).toBe(false);
  });
});

describe("DoctorCommand", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should report all checks passed when everything is configured", async () => {
    const configJson = JSON.stringify({
      defaultProfile: "default",
      defaultTemplate: "ats",
      defaultOutput: "stdout",
      temperature: 0.2,
      maxTokens: 8000,
      history: true,
      logging: true,
      promptVersion: "v1",
    });
    const envFileContent =
      "provider=openrouter\nmodel=openai/gpt-4o\napi_key=sk-test-key\n";

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      "default.json",
    ] as unknown as fs.Dirent[]);
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(configJson) // validateConfigFile
      .mockReturnValueOnce(envFileContent) // validateEnvFile
      .mockReturnValueOnce(configJson) // validateConfigValues
      .mockReturnValueOnce(
        // loadProfile
        JSON.stringify({
          name: "Test User",
          contact: { email: "test@example.com" },
          skills: ["TypeScript"],
          experience: [],
          education: [],
        }),
      );

    const doctorCmd = await getCommand("doctor");
    const result = await doctorCmd.execute([], createMockContext());
    expect(result.success).toBe(true);
    expect(result.message).toBe("All critical checks passed.");
  });

  it("should report failures when configuration is missing", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const doctorCmd = await getCommand("doctor");
    const context = createMockContext();
    const result = await doctorCmd.execute([], context);
    expect(result.success).toBe(false);
  });
});

describe("dispatch", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should show help when no args provided", async () => {
    const { createCommandRegistry, dispatch } =
      await import("../src/commands/index.js");
    const registry = createCommandRegistry();
    const result = await dispatch([], registry, createMockContext());
    expect(result.success).toBe(true);
  });

  it("should show version with --version", async () => {
    const { createCommandRegistry, dispatch } =
      await import("../src/commands/index.js");
    const registry = createCommandRegistry();
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const result = await dispatch(["--version"], registry, createMockContext());
    expect(result.success).toBe(true);
    spy.mockRestore();
  });

  it("should handle --init shorthand", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

    const { createCommandRegistry, dispatch } =
      await import("../src/commands/index.js");
    const registry = createCommandRegistry();
    const result = await dispatch(["--init"], registry, createMockContext());
    expect(result.success).toBe(true);
  });

  it("should report unknown commands", async () => {
    const { createCommandRegistry, dispatch } =
      await import("../src/commands/index.js");
    const registry = createCommandRegistry();
    const result = await dispatch(
      ["unknown-cmd"],
      registry,
      createMockContext(),
    );
    expect(result.success).toBe(false);
  });
});

describe("ValidateCommand", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should validate all profiles by default", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      "default.json",
    ] as unknown as fs.Dirent[]);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        name: "Test User",
        contact: { email: "test@example.com" },
        skills: ["TypeScript"],
        experience: [],
        education: [],
      }),
    );

    const validateCmd = await getCommand("validate");
    const result = await validateCmd.execute([], createMockContext());
    expect(result.success).toBe(true);
  });

  it("should validate config subcommand", async () => {
    const configJson = JSON.stringify({
      defaultProfile: "default",
      defaultTemplate: "ats",
      defaultOutput: "stdout",
      temperature: 0.2,
      maxTokens: 8000,
      history: true,
      logging: true,
      promptVersion: "v1",
    });
    const envFileContent =
      "provider=openrouter\nmodel=openai/gpt-4o\napi_key=sk-test-key\n";

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(configJson) // validateConfigFile
      .mockReturnValueOnce(envFileContent) // validateEnvFile
      .mockReturnValueOnce(configJson); // validateConfigValues

    const validateCmd = await getCommand("validate");
    const result = await validateCmd.execute(["config"], createMockContext());
    expect(result.success).toBe(true);
  });

  it("should validate prompts subcommand", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const validateCmd = await getCommand("validate");
    const result = await validateCmd.execute(["prompts"], createMockContext());
    // Built-in prompts exist, so validation should pass
    expect(result.success).toBe(true);
  });

  it("should validate templates subcommand", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const validateCmd = await getCommand("validate");
    const result = await validateCmd.execute(
      ["templates"],
      createMockContext(),
    );
    // Built-in templates exist, so validation should pass
    expect(result.success).toBe(true);
  });

  it("should report error for unknown subcommand", async () => {
    const validateCmd = await getCommand("validate");
    const result = await validateCmd.execute(["unknown"], createMockContext());
    expect(result.success).toBe(false);
  });
});
