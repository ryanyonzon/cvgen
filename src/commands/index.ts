/**
 * Command dispatcher and built-in commands for cvgen.
 */

import {
  CommandRegistry,
  type Command,
  type CommandContext,
  type CommandResult,
} from "./types.js";
import { checkConfiguration, getConfigDir } from "../config/index.js";

/**
 * Command: init
 * Initializes the configuration directory and default files.
 */
class InitCommand implements Command {
  public readonly name = "init";
  public readonly description = "Initialize the cvgen configuration directory";
  public readonly help = `
Usage: cvgen init [options]

Creates the configuration directory structure at ~/.config/cvgen/
with default configuration files, profile, prompts, and templates.

Options:
  --force   Overwrite existing files without prompting
  `.trim();

  public async execute(
    args: string[],
    context: CommandContext,
  ): Promise<CommandResult> {
    const { ensureConfigDir, saveConfig, saveEnvironment } =
      await import("../config/index.js");
    const { DEFAULT_CONFIG, DEFAULT_ENVIRONMENT } =
      await import("../types/index.js");

    const force = args.includes("--force");
    const existing = checkConfiguration();

    // Only require --force when actual configuration files exist
    // (config.json or .env). An empty directory or one with only
    // non-essential files (e.g., logs/) is not a real configuration.
    const hasExistingConfig = existing.configFile || existing.envFile;

    if (hasExistingConfig && !force) {
      context.logger.warn("Configuration files already exist.");
      context.logger.info("Use --force to overwrite existing configuration.");
      return {
        message: "Configuration already exists. Use --force to overwrite.",
        success: false,
        exitCode: 1,
      };
    }

    ensureConfigDir();
    saveConfig(DEFAULT_CONFIG);
    saveEnvironment(DEFAULT_ENVIRONMENT);

    context.logger.success("Configuration initialized successfully.");
    context.logger.info(`Configuration directory: ${getConfigDir()}`);
    context.logger.info("");
    context.logger.info("Generated files:");
    context.logger.info(
      "  config.json             - Application configuration",
    );
    context.logger.info("  .env                    - Provider credentials");
    context.logger.info(
      "  profiles/default.json   - Default candidate profile",
    );
    context.logger.info("  prompts/v1/             - Default AI prompts");
    context.logger.info("  templates/              - Default resume templates");

    return {
      message: "Configuration initialized successfully.",
      success: true,
    };
  }
}

/**
 * Command: profile
 * Manages candidate profiles.
 */
class ProfileCommand implements Command {
  public readonly name = "profile";
  public readonly description = "Manage candidate profiles";
  public readonly help = `
Usage: cvgen profile <subcommand> [options]

Manage candidate profiles stored in ~/.config/cvgen/profiles/.

Subcommands:
  list      List all available profiles
  show      Show details of a specific profile
  validate  Validate all profiles

Options:
  --name <name>   Profile name (for show)

Examples:
  cvgen profile list                  List all profiles
  cvgen profile show --name backend   Show the "backend" profile
  cvgen profile validate              Validate all profiles
  `.trim();

  public async execute(
    args: string[],
    context: CommandContext,
  ): Promise<CommandResult> {
    const { listProfiles, loadProfile, validateAllProfiles } =
      await import("../config/profile.js");
    const { validateProfile } = await import("../schemas/profile.js");

    if (args.length === 0 || args[0] === "list") {
      const profiles = listProfiles();

      if (profiles.length === 0) {
        context.logger.info("No profiles found.");
        context.logger.info(
          "Run `cvgen init` or create a profile in ~/.config/cvgen/profiles/.",
        );
        return {
          message: "No profiles found.",
          success: true,
        };
      }

      context.logger.info("Available profiles:");
      for (const name of profiles) {
        const marker =
          name === context.config.defaultProfile ? " (default)" : "";
        context.logger.success(`  ✔ ${name}${marker}`);
      }

      return {
        message: `Found ${profiles.length} profile(s).`,
        success: true,
      };
    }

    if (args[0] === "show") {
      const nameIndex = args.indexOf("--name");
      const profileName =
        nameIndex !== -1 && args[nameIndex + 1]
          ? args[nameIndex + 1]
          : context.config.defaultProfile;

      const profile = loadProfile(profileName);

      if (!profile) {
        context.logger.error(`Profile "${profileName}" not found.`);
        context.logger.info(
          "Use `cvgen profile list` to see available profiles.",
        );
        return {
          message: `Profile "${profileName}" not found.`,
          success: false,
          exitCode: 1,
        };
      }

      const validation = validateProfile(profile);

      context.logger.info(`Profile: ${profileName}`);
      context.logger.info(`  Name: ${profile.name || "(not set)"}`);
      context.logger.info(`  Headline: ${profile.headline || "(not set)"}`);
      context.logger.info(`  Email: ${profile.contact.email || "(not set)"}`);
      context.logger.info(`  Skills: ${(profile.skills ?? []).length} defined`);
      context.logger.info(
        `  Experience: ${(profile.experience ?? []).length} entries`,
      );
      context.logger.info(
        `  Education: ${(profile.education ?? []).length} entries`,
      );
      context.logger.info(
        `  Projects: ${(profile.projects ?? []).length} entries`,
      );

      if (validation.warnings.length > 0) {
        context.logger.info("");
        context.logger.warn("Warnings:");
        for (const w of validation.warnings) {
          context.logger.warn(`  ⚠ ${w.path}: ${w.message}`);
        }
      }

      return {
        message: `Profile "${profileName}" loaded successfully.`,
        success: true,
      };
    }

    if (args[0] === "validate") {
      const results = validateAllProfiles();

      if (results.size === 0) {
        context.logger.info("No profiles to validate.");
        return {
          message: "No profiles found.",
          success: true,
        };
      }

      let allValid = true;

      for (const [name, result] of results) {
        if (result.valid) {
          context.logger.success(`✔ ${name} - valid`);
          for (const w of result.warnings) {
            context.logger.warn(`  ⚠ ${w}`);
          }
        } else {
          context.logger.error(`✘ ${name} - invalid`);
          for (const e of result.errors) {
            context.logger.error(`  • ${e}`);
          }
          allValid = false;
        }
      }

      return {
        message: allValid
          ? "All profiles are valid."
          : "Some profiles have validation errors.",
        success: allValid,
        exitCode: allValid ? 0 : 1,
      };
    }

    context.logger.error(`Unknown profile subcommand: ${args[0]}`);
    context.logger.info("Usage: cvgen profile <list|show|validate>");
    return {
      message: `Unknown subcommand: ${args[0]}`,
      success: false,
      exitCode: 1,
    };
  }
}

/**
 * Command: config
 * Manages application configuration.
 */
class ConfigCommand implements Command {
  public readonly name = "config";
  public readonly description = "Manage application configuration";
  public readonly help = `
Usage: cvgen config <subcommand>

Manage cvgen configuration.

Subcommands:
  show     Display current configuration
  profile  Set the default profile

Options:
  --name <name>   Profile name (for profile subcommand)

Examples:
  cvgen config show                      Display current configuration
  cvgen config profile --name backend    Set default profile to "backend"
  `.trim();

  public async execute(
    args: string[],
    context: CommandContext,
  ): Promise<CommandResult> {
    const { loadConfig, saveConfig } = await import("../config/index.js");

    if (args.length === 0 || args[0] === "show") {
      const config = loadConfig();

      context.logger.info("Current Configuration:");
      context.logger.info(`  Default Profile: ${config.defaultProfile}`);
      context.logger.info(`  Default Template: ${config.defaultTemplate}`);
      context.logger.info(`  Default Output: ${config.defaultOutput}`);
      context.logger.info(`  Temperature: ${config.temperature}`);
      context.logger.info(`  Max Tokens: ${config.maxTokens}`);
      context.logger.info(
        `  History: ${config.history ? "enabled" : "disabled"}`,
      );
      context.logger.info(
        `  Logging: ${config.logging ? "enabled" : "disabled"}`,
      );
      context.logger.info(`  Prompt Version: ${config.promptVersion}`);

      return {
        message: "Configuration displayed.",
        success: true,
      };
    }

    if (args[0] === "profile") {
      const nameIndex = args.indexOf("--name");
      const profileName =
        nameIndex !== -1 && args[nameIndex + 1] ? args[nameIndex + 1] : null;

      if (!profileName) {
        context.logger.error(
          "Usage: cvgen config profile --name <profile-name>",
        );
        return {
          message: "Profile name is required.",
          success: false,
          exitCode: 1,
        };
      }

      const config = loadConfig();
      config.defaultProfile = profileName;
      saveConfig(config);

      context.logger.success(`Default profile set to "${profileName}".`);

      return {
        message: `Default profile set to "${profileName}".`,
        success: true,
      };
    }

    context.logger.error(`Unknown config subcommand: ${args[0]}`);
    context.logger.info("Usage: cvgen config <show|profile>");
    return {
      message: `Unknown subcommand: ${args[0]}`,
      success: false,
      exitCode: 1,
    };
  }
}

/**
 * Command: generate
 * Generates a tailored resume and cover letter using the AI pipeline.
 */
class GenerateCommand implements Command {
  public readonly name = "generate";
  public readonly description = "Generate a tailored resume and cover letter";
  public readonly help = `
Usage: cvgen generate [options] <job-description>

Generates a tailored resume and cover letter from a job description
and a candidate profile.

Arguments:
  job-description    Path to job description file, URL, or stdin

Options:
  --profile <name>  Profile to use (default: from config)
  --template <name> Template to use (default: from config)
  --out <dir>       Output directory
  --cover <text>    Additional context for cover letter generation
  --dry-run         Show analysis without AI generation
  --explain         Show reasoning for each decision
  --stdout          Output to stdout (default)
  --output <type>   Output type: markdown, json (default: markdown)
  `.trim();

  public async execute(
    args: string[],
    context: CommandContext,
  ): Promise<CommandResult> {
    const { parseJobDescription } = await import("../parser/index.js");
    const { loadProfile } = await import("../config/profile.js");
    const { createProvider } = await import("../ai/registry.js");
    const { runPipeline } = await import("../pipeline/index.js");
    const { writeOutput, loadTemplate } = await import("../renderer/index.js");

    // Parse options
    const profileIndex = args.indexOf("--profile");
    const profileName =
      profileIndex !== -1 && args[profileIndex + 1]
        ? args[profileIndex + 1]
        : context.config.defaultProfile;

    const templateIndex = args.indexOf("--template");
    const templateName =
      templateIndex !== -1 && args[templateIndex + 1]
        ? args[templateIndex + 1]
        : context.config.defaultTemplate;

    const outputIndex = args.indexOf("--output");
    const outputType =
      outputIndex !== -1 && args[outputIndex + 1]
        ? args[outputIndex + 1]
        : "markdown";

    const outDirIndex = args.indexOf("--out");
    const outDir =
      outDirIndex !== -1 && args[outDirIndex + 1]
        ? args[outDirIndex + 1]
        : undefined;

    const dryRun = args.includes("--dry-run");
    const explain = args.includes("--explain");

    const coverIndex = args.indexOf("--cover");
    const coverNote =
      coverIndex !== -1 && args[coverIndex + 1]
        ? args[coverIndex + 1]
        : undefined;

    // Determine output mode
    const outputMode =
      outputType === "json"
        ? ("json" as const)
        : outDir
          ? ("directory" as const)
          : ("stdout" as const);

    // Get the job description source (last non-option arg)
    const jobSource = args.find((a) => !a.startsWith("--")) || "-";

    // Load profile
    context.logger.info(`Loading profile "${profileName}"...`);
    const profile = loadProfile(profileName);
    if (!profile) {
      context.logger.error(`Profile "${profileName}" not found.`);
      context.logger.info(
        "Run `cvgen init` or create a profile in ~/.config/cvgen/profiles/.",
      );
      return {
        message: `Profile "${profileName}" not found.`,
        success: false,
        exitCode: 1,
      };
    }
    context.logger.success(`Profile "${profileName}" loaded.`);

    // Parse job description
    context.logger.info("Parsing job description...");
    const parsed = await parseJobDescription(jobSource);
    if (!parsed.success || !parsed.data) {
      context.logger.error(`Failed to parse job description: ${parsed.error}`);
      return {
        message: `Failed to parse job description: ${parsed.error}`,
        success: false,
        exitCode: 1,
      };
    }
    context.logger.success(
      `Job parsed: ${parsed.data.title}${parsed.data.company ? ` at ${parsed.data.company}` : ""}`,
    );

    // Validate API key
    if (!dryRun) {
      const { validateApiKey } = await import("../config/index.js");
      try {
        validateApiKey(context.environment);
      } catch (error) {
        context.logger.error((error as Error).message);
        return {
          message: "API key not configured.",
          success: false,
          exitCode: 1,
        };
      }
    }

    // Load template content for rendering
    let templateContent: string | undefined;
    if (!dryRun && outputMode !== "json") {
      try {
        templateContent = loadTemplate(templateName);
        context.logger.verbose(`Using template: ${templateName}`);
      } catch {
        context.logger.warn(
          `Template "${templateName}" not found, using default.`,
        );
        templateContent = loadTemplate("ats");
      }
    }

    // Create provider (only for non-dry-run)
    let provider = null;
    if (!dryRun) {
      try {
        provider = createProvider(context.environment);
        context.logger.verbose(
          `Using provider: ${context.environment.provider}`,
        );
        context.logger.verbose(`Using model: ${context.environment.model}`);
      } catch (error) {
        context.logger.error((error as Error).message);
        return {
          message: "Failed to create AI provider.",
          success: false,
          exitCode: 1,
        };
      }
    }

    // Run pipeline
    try {
      const result = await runPipeline({
        profile,
        job: parsed.data,
        config: context.config,
        env: context.environment,
        provider: provider!,
        logger: context.logger,
        dryRun,
        explain,
        coverNote,
      });

      // Output result
      if (dryRun) {
        context.logger.success("\nDry run completed.");
        context.logger.info(
          `Keywords: ${result.keywords.requiredSkills.length} required, ${result.keywords.preferredSkills.length} preferred`,
        );
        context.logger.info(
          `Top experience: ${result.ranking.experience
            .slice(0, 3)
            .map((e) => e.item.role)
            .join(", ")}`,
        );
        context.logger.info(
          `Primary skills: ${result.ranking.skills.primary.join(", ")}`,
        );
      } else {
        context.logger.success("\nGeneration completed.");
        context.logger.info(`ATS Score: ${result.atsReport.overallScore}`);
        context.logger.info(
          `Duration: ${(result.metadata.duration / 1000).toFixed(1)}s`,
        );

        // Render and write output
        await writeOutput(result, profile, {
          mode: outputMode,
          outDir,
          templateName,
          templateContent,
        });

        // Save to history if enabled
        if (context.config.history && outputMode !== "json") {
          try {
            const { saveHistory } = await import("../history/index.js");
            const { renderDocument, renderResumeOnly, renderCoverLetterOnly } =
              await import("../renderer/index.js");

            const resumeMd = renderResumeOnly(
              profile,
              result.resume,
              templateContent,
            );
            const coverLetterMd = renderCoverLetterOnly(
              profile,
              result.coverLetter,
            );
            const combinedMd = renderDocument(
              profile,
              result.resume,
              result.coverLetter,
              templateContent,
            );

            await saveHistory(
              result,
              profileName,
              resumeMd,
              coverLetterMd || null,
              combinedMd,
            );
            context.logger.verbose("Generation saved to history.");
          } catch {
            // History saving is non-critical; continue
            context.logger.verbose("Failed to save history (non-critical).");
          }
        }

        if (outputMode === "directory") {
          context.logger.success(`Output written to: ${outDir}`);
        }
      }

      return {
        message: dryRun ? "Dry run completed." : "Generation completed.",
        success: true,
      };
    } catch (error) {
      if (error instanceof Error) {
        context.logger.error(`Pipeline failed: ${error.message}`);
      }
      return {
        message: "Generation failed.",
        success: false,
        exitCode: 1,
      };
    }
  }
}

/**
 * Command: validate
 * Validates profiles, configuration, prompts, and templates.
 */
class ValidateCommand implements Command {
  public readonly name = "validate";
  public readonly description =
    "Validate profiles, configuration, prompts, and templates";
  public readonly help = `
Usage: cvgen validate [options] [file]

Validates various components of the cvgen setup without AI generation.

Subcommands:
  profile     Validate profiles (default)
  config      Validate configuration files
  prompts     Validate prompt files
  templates   Validate template files
  job <file>  Validate and analyze a job description

Options:
  --name <name>  Profile name (for profile subcommand)
  --ats          Include ATS analysis (for job subcommand)

Examples:
  cvgen validate                         Validate all profiles
  cvgen validate profile --name backend  Validate specific profile
  cvgen validate config                  Validate configuration files
  cvgen validate prompts                 Validate prompt files
  cvgen validate templates               Validate template files
  cvgen validate job job.md              Parse and analyze a job description
  cvgen validate job job.md --ats        Include ATS keyword analysis
  `.trim();

  public async execute(
    args: string[],
    context: CommandContext,
  ): Promise<CommandResult> {
    const subcommand = args[0];

    if (!subcommand || subcommand === "profile") {
      return this.validateProfile(args, context);
    }

    if (subcommand === "config") {
      return this.validateConfig(context);
    }

    if (subcommand === "prompts") {
      return this.validatePrompts(context);
    }

    if (subcommand === "templates") {
      return this.validateTemplates(context);
    }

    if (subcommand === "job") {
      return this.validateJob(args, context);
    }

    context.logger.error(`Unknown validate subcommand: ${subcommand}`);
    context.logger.info(
      "Usage: cvgen validate <profile|config|prompts|templates|job>",
    );
    return {
      message: `Unknown subcommand: ${subcommand}`,
      success: false,
      exitCode: 1,
    };
  }

  /** Validate profiles. */
  private async validateProfile(
    args: string[],
    context: CommandContext,
  ): Promise<CommandResult> {
    const { loadProfile, validateAllProfiles } =
      await import("../config/profile.js");
    const { validateProfile } = await import("../schemas/profile.js");

    const nameIndex = args.indexOf("--name");
    const profileName =
      nameIndex !== -1 && args[nameIndex + 1] ? args[nameIndex + 1] : null;

    if (profileName) {
      context.logger.info(`Validating profile "${profileName}"...`);

      const profile = loadProfile(profileName);
      if (!profile) {
        context.logger.error(`Profile "${profileName}" not found.`);
        context.logger.info(
          "Use `cvgen profile list` to see available profiles.",
        );
        return {
          message: `Profile "${profileName}" not found.`,
          success: false,
          exitCode: 1,
        };
      }

      const validation = validateProfile(profile);

      if (validation.valid) {
        context.logger.success(`✔ ${profileName} - valid`);
        for (const w of validation.warnings) {
          context.logger.warn(`  ⚠ ${w.path}: ${w.message}`);
        }
      } else {
        context.logger.error(`✘ ${profileName} - invalid`);
        for (const e of validation.errors) {
          context.logger.error(`  • ${e.path}: ${e.message}`);
        }
      }

      return {
        message: validation.valid
          ? `Profile "${profileName}" is valid.`
          : `Profile "${profileName}" has validation errors.`,
        success: validation.valid,
        exitCode: validation.valid ? 0 : 1,
      };
    }

    // Validate all profiles
    context.logger.info("Validating all profiles...\n");
    const results = validateAllProfiles();

    if (results.size === 0) {
      context.logger.info("No profiles found.");
      context.logger.info(
        "Run `cvgen init` or create a profile in ~/.config/cvgen/profiles/.",
      );
      return { message: "No profiles to validate.", success: true };
    }

    let allValid = true;
    for (const [name, result] of results) {
      if (result.valid) {
        context.logger.success(`✔ ${name} - valid`);
        for (const w of result.warnings) {
          context.logger.warn(`  ⚠ ${w}`);
        }
      } else {
        context.logger.error(`✘ ${name} - invalid`);
        for (const e of result.errors) {
          context.logger.error(`  • ${e}`);
        }
        allValid = false;
      }
    }

    return {
      message: allValid
        ? "All profiles are valid."
        : "Some profiles have validation errors.",
      success: allValid,
      exitCode: allValid ? 0 : 1,
    };
  }

  /** Validate configuration files. */
  private async validateConfig(
    context: CommandContext,
  ): Promise<CommandResult> {
    const { validateConfiguration } = await import("../validation/index.js");

    context.logger.info("Validating configuration...\n");
    const result = validateConfiguration();

    for (const check of result.checks) {
      if (check.ok) {
        context.logger.success(`✔ ${check.label}`);
      } else {
        context.logger.error(`✘ ${check.label}`);
        if (check.message) {
          context.logger.warn(`  ${check.message}`);
        }
        if (check.hint) {
          context.logger.info(`  → ${check.hint}`);
        }
      }
    }

    context.logger.info("");
    return {
      message: result.summary,
      success: result.valid,
      exitCode: result.valid ? 0 : 1,
    };
  }

  /** Validate prompt files. */
  private async validatePrompts(
    context: CommandContext,
  ): Promise<CommandResult> {
    const { validateAllPrompts, validatePromptStructure } =
      await import("../validation/index.js");

    const promptVersion = context.config.promptVersion;
    context.logger.info(`Validating prompts (version: ${promptVersion})...\n`);

    const structureCheck = validatePromptStructure(promptVersion);
    if (!structureCheck.ok) {
      context.logger.warn(`  ${structureCheck.message}`);
      if (structureCheck.hint) {
        context.logger.info(`  → ${structureCheck.hint}`);
      }
      context.logger.info("");
    }

    const checks = validateAllPrompts(promptVersion);
    let allValid = true;

    for (const check of checks) {
      if (check.ok) {
        context.logger.success(`✔ ${check.label}`);
      } else {
        context.logger.error(`✘ ${check.label}`);
        allValid = false;
        if (check.message) {
          context.logger.warn(`  ${check.message}`);
        }
        if (check.hint) {
          context.logger.info(`  → ${check.hint}`);
        }
      }
    }

    context.logger.info("");
    return {
      message: allValid
        ? "All prompts are valid."
        : "Some prompts have issues.",
      success: allValid,
      exitCode: allValid ? 0 : 1,
    };
  }

  /** Validate template files. */
  private async validateTemplates(
    context: CommandContext,
  ): Promise<CommandResult> {
    const { validateAllTemplates, listTemplates } =
      await import("../validation/index.js");

    const templateNames = listTemplates();
    if (templateNames.length === 0) {
      context.logger.info("No templates found.");
      context.logger.info("Run `cvgen init` to create default templates.");
      return { message: "No templates to validate.", success: true };
    }

    context.logger.info(`Validating ${templateNames.length} template(s)...\n`);

    const checks = validateAllTemplates();
    let allValid = true;

    for (const check of checks) {
      if (check.ok) {
        context.logger.success(`✔ ${check.label}`);
        if (check.message) {
          context.logger.warn(`  ${check.message}`);
        }
      } else {
        context.logger.error(`✘ ${check.label}`);
        allValid = false;
        if (check.message) {
          context.logger.error(`  ${check.message}`);
        }
        if (check.hint) {
          context.logger.info(`  → ${check.hint}`);
        }
      }
    }

    context.logger.info("");
    return {
      message: allValid
        ? "All templates are valid."
        : "Some templates have issues.",
      success: allValid,
      exitCode: allValid ? 0 : 1,
    };
  }

  /** Parse and validate a job description file. */
  private async validateJob(
    args: string[],
    context: CommandContext,
  ): Promise<CommandResult> {
    const { parseJobDescription } = await import("../parser/index.js");

    const jobIndex = args.indexOf("job");
    const jobSource =
      jobIndex !== -1 &&
      args[jobIndex + 1] &&
      !args[jobIndex + 1].startsWith("--")
        ? args[jobIndex + 1]
        : null;

    const includeATS = args.includes("--ats");

    if (!jobSource) {
      context.logger.error("No job description file specified.");
      context.logger.info("Usage: cvgen validate job <file> [options]");
      return {
        message: "Job description file is required.",
        success: false,
        exitCode: 1,
      };
    }

    context.logger.info(`Parsing job description: ${jobSource}...`);
    const parsed = await parseJobDescription(jobSource);

    if (!parsed.success || !parsed.data) {
      context.logger.error(`Failed to parse job description: ${parsed.error}`);
      return {
        message: `Failed to parse: ${parsed.error}`,
        success: false,
        exitCode: 1,
      };
    }

    const job = parsed.data;
    context.logger.success("\nJob Description Analysis:");
    context.logger.info(`  Title: ${job.title}`);
    if (job.company) context.logger.info(`  Company: ${job.company}`);
    if (job.location) context.logger.info(`  Location: ${job.location}`);
    if (job.employmentType)
      context.logger.info(`  Type: ${job.employmentType}`);
    context.logger.info(`  Content length: ${job.content.length} characters`);

    context.logger.info("");

    // Do deterministic keyword extraction
    const { extractKeywordsDeterministic } =
      await import("../pipeline/index.js");
    const keywords = extractKeywordsDeterministic(job);

    context.logger.info("Keywords extracted:");
    if (keywords.requiredSkills.length > 0) {
      context.logger.success(
        `  Required: ${keywords.requiredSkills.join(", ")}`,
      );
    }
    if (keywords.preferredSkills.length > 0) {
      context.logger.info(
        `  Preferred: ${keywords.preferredSkills.join(", ")}`,
      );
    }

    if (includeATS && keywords.requiredSkills.length > 0) {
      const { loadProfile } = await import("../config/profile.js");
      const profile = loadProfile(context.config.defaultProfile);

      if (profile && (profile.skills ?? []).length > 0) {
        const profileSkills = (profile.skills ?? []).map((s: string) =>
          s.toLowerCase(),
        );
        const missing = keywords.requiredSkills.filter(
          (ks) => !profileSkills.includes(ks.toLowerCase()),
        );
        const matched = keywords.requiredSkills.filter((ks) =>
          profileSkills.includes(ks.toLowerCase()),
        );

        context.logger.info("");
        context.logger.info("ATS Keyword Match (against profile):");
        context.logger.info(
          `  Score: ${keywords.requiredSkills.length > 0 ? Math.round((matched.length / keywords.requiredSkills.length) * 100) : 0}%`,
        );
        if (matched.length > 0) {
          context.logger.success(`  Matched: ${matched.join(", ")}`);
        }
        if (missing.length > 0) {
          context.logger.warn(`  Missing: ${missing.join(", ")}`);
        }
      } else {
        context.logger.info("");
        context.logger.warn(
          "Profile has no skills defined - cannot compute ATS match.",
        );
        context.logger.info("Add skills to your profile and try again.");
      }
    }

    context.logger.info("");
    return {
      message: `Successfully parsed: ${job.title}${job.company ? ` at ${job.company}` : ""}`,
      success: true,
    };
  }
}

/**
 * Command: doctor
 * Runs comprehensive system diagnostics.
 */
class DoctorCommand implements Command {
  public readonly name = "doctor";
  public readonly description = "Run system diagnostics";
  public readonly help = `
Usage: cvgen doctor [options]

Checks configuration, profile, provider, API key, prompts, templates,
and system health. Provides actionable feedback for any issues found.

Options:
  --verbose   Show detailed diagnostic information
  --fix       Attempt to fix common issues (future)

Examples:
  cvgen doctor           Run basic diagnostics
  cvgen doctor --verbose  Show detailed diagnostics
  `.trim();

  public async execute(
    args: string[],
    context: CommandContext,
  ): Promise<CommandResult> {
    const { checkConfiguration } = await import("../config/index.js");
    const { listProfiles } = await import("../config/profile.js");
    const {
      validateConfigFile,
      validateEnvFile,
      validateConfigValues,
      validateAllPrompts,
      validatePromptStructure,
      validateAllTemplates,
      listTemplates,
    } = await import("../validation/index.js");

    const verbose = args.includes("--verbose") || context.verbose;

    context.logger.info("Running diagnostics...\n");

    const diagCheck = (
      label: string,
      ok: boolean,
      message?: string,
      hint?: string,
    ): void => {
      if (ok) {
        context.logger.success(`✔ ${label}`);
      } else {
        context.logger.error(`✘ ${label}`);
        if (message && verbose) {
          context.logger.warn(`  ${message}`);
        }
        if (hint && verbose) {
          context.logger.info(`  → ${hint}`);
        }
      }
    };

    // Section 1: Directory Structure
    if (verbose) {
      context.logger.info("[Directory Structure]");
    }

    const checks = checkConfiguration();
    diagCheck("Config directory exists", checks.configDir);
    diagCheck("Config file exists", checks.configFile);
    diagCheck("Environment file exists", checks.envFile);
    diagCheck("Profiles directory exists", checks.profiles);
    diagCheck("Prompts directory exists", checks.prompts);
    diagCheck("Templates directory exists", checks.templates);

    if (verbose) context.logger.info("");

    // Section 2: Configuration
    if (verbose) {
      context.logger.info("[Configuration]");
    }

    const configFileCheck = validateConfigFile();
    diagCheck(
      configFileCheck.label,
      configFileCheck.ok,
      configFileCheck.message,
      configFileCheck.hint,
    );

    const envFileCheck = validateEnvFile();
    diagCheck(
      envFileCheck.label,
      envFileCheck.ok,
      envFileCheck.message,
      envFileCheck.hint,
    );

    const configValuesCheck = validateConfigValues();
    diagCheck(
      configValuesCheck.label,
      configValuesCheck.ok,
      configValuesCheck.message,
      configValuesCheck.hint,
    );

    // Provider and model checks
    if (context.environment.provider && context.environment.provider.trim()) {
      diagCheck(`Provider: ${context.environment.provider}`, true);
    } else {
      diagCheck(
        "Provider configured",
        false,
        "Provider is not set in .env",
        "Set provider in ~/.config/cvgen/.env (e.g., provider=openrouter)",
      );
    }

    if (context.environment.model && context.environment.model.trim()) {
      diagCheck(`Model: ${context.environment.model}`, true);
    } else {
      diagCheck(
        "Model configured",
        false,
        "Model is not set in .env",
        "Set model in ~/.config/cvgen/.env (e.g., model=openai/gpt-4o)",
      );
    }

    // API key check
    const remoteProviders = ["openrouter", "openai", "anthropic", "google"];
    const isRemoteProvider = remoteProviders.includes(
      context.environment.provider.toLowerCase(),
    );
    if (context.environment.apiKey && context.environment.apiKey.trim()) {
      diagCheck("API key configured", true);
    } else if (isRemoteProvider) {
      diagCheck(
        "API key configured",
        false,
        `No API key found for ${context.environment.provider}`,
        "Add api_key to ~/.config/cvgen/.env or use a local provider.",
      );
    } else {
      diagCheck(
        "API key configured",
        true,
        `Local provider ${context.environment.provider} does not require an API key`,
      );
    }

    if (verbose) context.logger.info("");

    // Section 3: Profiles
    if (verbose) {
      context.logger.info("[Profiles]");
    }

    const profiles = listProfiles();
    diagCheck(
      "Profiles available",
      profiles.length > 0,
      profiles.length > 0 ? undefined : "No profile files found",
      profiles.length > 0
        ? undefined
        : "Run `cvgen init` or add a profile to ~/.config/cvgen/profiles/",
    );

    if (profiles.length > 0) {
      const defaultExists = profiles.includes(context.config.defaultProfile);
      diagCheck(
        `Default profile "${context.config.defaultProfile}"`,
        defaultExists,
        defaultExists
          ? undefined
          : `Profile "${context.config.defaultProfile}" not found`,
        defaultExists
          ? undefined
          : `Available profiles: ${profiles.join(", ")}. Use \`cvgen config profile --name <name>\` to change the default.`,
      );
      diagCheck(`Total profiles: ${profiles.length}`, true);
    }

    if (verbose) context.logger.info("");

    // Section 4: Prompts
    if (verbose) {
      context.logger.info("[Prompts]");
    }

    const promptStructureCheck = validatePromptStructure(
      context.config.promptVersion,
    );
    diagCheck(
      `Prompt version: ${context.config.promptVersion}`,
      true,
      promptStructureCheck.message,
      promptStructureCheck.hint,
    );

    const promptChecks = validateAllPrompts(context.config.promptVersion);
    for (const pc of promptChecks) {
      diagCheck(pc.label, pc.ok, pc.message, pc.hint);
    }

    if (verbose) context.logger.info("");

    // Section 5: Templates
    if (verbose) {
      context.logger.info("[Templates]");
    }

    const templateNames = listTemplates();
    diagCheck(
      `Templates available: ${templateNames.length}`,
      templateNames.length > 0,
      templateNames.length > 0 ? undefined : "No template files found",
      templateNames.length > 0
        ? undefined
        : "Run `cvgen init` to create default templates.",
    );

    if (templateNames.length > 0) {
      const defaultTemplateExists = templateNames.includes(
        context.config.defaultTemplate,
      );
      diagCheck(
        `Default template: ${context.config.defaultTemplate}.md`,
        defaultTemplateExists,
        defaultTemplateExists
          ? undefined
          : `Template "${context.config.defaultTemplate}.md" not found`,
        defaultTemplateExists
          ? undefined
          : `Available templates: ${templateNames.join(", ")}. Use \`cvgen generate --template <name>\` to select one.`,
      );

      if (verbose) {
        const templateChecks = validateAllTemplates();
        for (const tc of templateChecks) {
          diagCheck(tc.label, tc.ok, tc.message, tc.hint);
        }
      }
    }

    if (verbose) context.logger.info("");

    // Section 6: Network & Connectivity
    if (verbose) {
      context.logger.info("[Network]");
    }

    await this.checkInternetConnectivity(diagCheck, context);

    if (verbose) {
      await this.checkProviderConnectivity(diagCheck, context);
    }

    if (verbose) context.logger.info("");

    // Determine overall status
    const allOk =
      checks.configDir &&
      checks.configFile &&
      (checks.envFile || !isRemoteProvider) &&
      checks.profiles &&
      profiles.length > 0 &&
      configFileCheck.ok &&
      context.environment.provider.trim() !== "";

    context.logger.info("");
    return {
      message: allOk
        ? "All critical checks passed."
        : "Some critical checks failed. Review the diagnostics above.",
      success: allOk,
      exitCode: allOk ? 0 : 1,
    };
  }

  /** Check internet connectivity by performing a DNS lookup. */
  private async checkInternetConnectivity(
    diagCheck: (
      label: string,
      ok: boolean,
      message?: string,
      hint?: string,
    ) => void,
    context: CommandContext,
  ): Promise<void> {
    const remoteProviders = ["openrouter", "openai", "anthropic", "google"];
    const isRemote = remoteProviders.includes(
      context.environment.provider.toLowerCase(),
    );

    if (!isRemote) {
      diagCheck(
        "Internet connectivity",
        true,
        `Local provider ${context.environment.provider} does not require internet`,
      );
      return;
    }

    try {
      const url = new URL(context.environment.baseUrl);
      const hostname = url.hostname;

      const dns = await import("node:dns/promises");
      await dns.resolve(hostname);

      diagCheck(
        `Internet connectivity (${hostname})`,
        true,
        `Successfully resolved ${hostname}`,
      );
    } catch (error) {
      diagCheck(
        "Internet connectivity",
        false,
        `Failed to resolve ${context.environment.baseUrl}: ${(error as Error).message}`,
        "Check your internet connection and DNS settings.",
      );
    }
  }

  /** Test provider connectivity by making a lightweight API call. */
  private async checkProviderConnectivity(
    diagCheck: (
      label: string,
      ok: boolean,
      message?: string,
      hint?: string,
    ) => void,
    context: CommandContext,
  ): Promise<void> {
    try {
      const { createProvider } = await import("../ai/registry.js");
      const provider = createProvider(context.environment);
      const models = await provider.models();

      const modelAvailable = models.some(
        (m) => m.id === context.environment.model,
      );

      if (modelAvailable) {
        diagCheck(
          `Model "${context.environment.model}" available`,
          true,
          `Found ${models.length} model(s) from ${context.environment.provider}`,
        );
      } else {
        diagCheck(
          `Model "${context.environment.model}" available`,
          false,
          `Model "${context.environment.model}" not found in provider's model list`,
          `Use \`cvgen models\` to see available models for ${context.environment.provider}.`,
        );
      }
    } catch (error) {
      diagCheck(
        `Provider connectivity: ${context.environment.provider}`,
        false,
        `Failed to connect: ${(error as Error).message}`,
        "Check your API key, base URL, and network connectivity.",
      );
    }
  }
}

/**
 * Command: providers
 * Lists available AI providers using the provider registry.
 */
class ProvidersCommand implements Command {
  public readonly name = "providers";
  public readonly description = "List available AI providers";
  public readonly help = `
Usage: cvgen providers

Lists installed and available AI providers.
  `.trim();

  public async execute(
    _args: string[],
    context: CommandContext,
  ): Promise<CommandResult> {
    const { getDefaultRegistry } = await import("../ai/index.js");
    const registry = getDefaultRegistry();
    const providers = registry.list();

    context.logger.info("Available Providers:");

    for (const provider of providers) {
      const isDefault = provider.name === context.environment.provider;
      const marker = isDefault ? " (default)" : "";
      context.logger.success(`  ✔ ${provider.name}${marker}`);
      context.logger.verbose(`    ${provider.description}`);
    }

    if (providers.length === 0) {
      context.logger.info("  No providers registered.");
    }

    return {
      message: `${providers.length} provider(s) listed.`,
      success: true,
    };
  }
}

/**
 * Command: models
 * Lists available models from the configured provider.
 */
class ModelsCommand implements Command {
  public readonly name = "models";
  public readonly description =
    "List available models for the configured provider";
  public readonly help = `
Usage: cvgen models [options]

Lists available models for the currently configured provider.

Options:
  --provider <name>  Show models for a specific provider
  `.trim();

  public async execute(
    args: string[],
    context: CommandContext,
  ): Promise<CommandResult> {
    const { getDefaultRegistry } = await import("../ai/index.js");

    const providerIndex = args.indexOf("--provider");
    const providerName =
      providerIndex !== -1 && args[providerIndex + 1]
        ? args[providerIndex + 1]
        : context.environment.provider;

    const registry = getDefaultRegistry();

    if (!registry.has(providerName)) {
      context.logger.error(
        `Provider "${providerName}" is not available. Use \`cvgen providers\` to see available providers.`,
      );
      return {
        message: `Provider "${providerName}" not found.`,
        success: false,
        exitCode: 1,
      };
    }

    try {
      context.logger.info(`Fetching models from ${providerName}...`);

      const provider = registry.create(providerName, context.environment);
      const models = await provider.models();

      if (models.length === 0) {
        context.logger.info(
          `No models returned by provider "${providerName}".`,
        );
        return {
          message: "No models found.",
          success: true,
        };
      }

      context.logger.success(
        `Found ${models.length} model(s) from ${providerName}:`,
      );
      context.logger.info("");

      for (const model of models) {
        const pricing =
          model.pricingInput !== undefined
            ? `$${model.pricingInput}/1M in, $${model.pricingOutput}/1M out`
            : "";
        const contextInfo = model.contextLength
          ? ` | ${(model.contextLength / 1000).toFixed(0)}K context`
          : "";
        context.logger.info(`  • ${model.id}${contextInfo}`);
        if (pricing) {
          context.logger.verbose(`    ${pricing}`);
        }
      }

      return {
        message: `${models.length} model(s) listed.`,
        success: true,
      };
    } catch (error) {
      if (error instanceof Error) {
        context.logger.error(`Failed to fetch models: ${error.message}`);
      }
      return {
        message: "Failed to fetch models.",
        success: false,
        exitCode: 1,
      };
    }
  }
}

/**
 * Create and register all built-in commands.
 */
export function createCommandRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  registry.register(new InitCommand());
  registry.register(new ProfileCommand());
  registry.register(new ConfigCommand());
  registry.register(new GenerateCommand());
  registry.register(new ValidateCommand());
  registry.register(new DoctorCommand());
  registry.register(new ProvidersCommand());
  registry.register(new ModelsCommand());

  return registry;
}

/**
 * Display help text.
 */
function showHelp(): CommandResult {
  const { version } = { version: "1.0.0" };
  const lines = [
    `cvgen v${version}`,
    "AI-powered CLI for generating professional, ATS-friendly resumes and cover letters.",
    "",
    "Usage:",
    "  cvgen [command] [options] [arguments]",
    "",
    "Commands:",
    "  init         Initialize the configuration directory",
    "  profile      Manage candidate profiles (list|show|validate)",
    "  config       Manage application configuration (show|profile)",
    "  generate     Generate a tailored resume and cover letter",
    "  validate     Validate profiles, configuration, prompts, and templates",
    "  doctor       Run system diagnostics",
    "  providers    List available AI providers",
    "  models       List available models",
    "  help         Display this help message",
    "",
    "Options:",
    "  --verbose    Enable verbose logging",
    "  --debug      Enable debug logging",
    "  --no-color   Disable colored output",
    "  --version    Display version information",
    "",
    "Examples:",
    "  cvgen init                          Initialize configuration",
    "  cvgen init --force                  Reinitialize configuration",
    "  cvgen doctor                        Run diagnostics",
    "  cvgen profile list                  List all profiles",
    "  cvgen profile validate              Validate all profiles",
    "  cvgen config profile --name backend Set default profile",
    "  cvgen generate job.md               Generate resume and cover letter",
    "  cvgen generate job.md --out ./docs  Output to directory",
    "  cvgen generate job.md --cover ...  Add extra context to cover letter",
    "  cat job.md | cvgen generate         Read from stdin",
    "",
    "Documentation: https://github.com/ryanyonzon/cvgen",
  ];

  for (const line of lines) {
    console.log(line);
  }

  return {
    message: "Help displayed.",
    success: true,
  };
}

/**
 * Display version information.
 */
export function showVersion(): void {
  const { version } = { version: "1.0.0" };
  console.log(`cvgen v${version}`);
}

/**
 * Parse CLI arguments and dispatch to the appropriate command.
 */
export async function dispatch(
  args: string[],
  registry: CommandRegistry,
  context: CommandContext,
): Promise<CommandResult> {
  if (args.length === 0) {
    return showHelp();
  }

  const commandName = args[0];
  const commandArgs = args.slice(1);

  // Handle global flags
  if (commandName === "--version" || commandName === "-v") {
    showVersion();
    return { message: "", success: true };
  }

  if (commandName === "--help" || commandName === "-h") {
    return showHelp();
  }

  // Handle --generate shorthand
  if (commandName === "--generate" || commandName === "-g") {
    const generateCmd = registry.get("generate");
    if (generateCmd) {
      return generateCmd.execute(commandArgs, context);
    }
  }

  // Handle --init shorthand
  if (commandName === "--init") {
    const initCmd = registry.get("init");
    if (initCmd) {
      return initCmd.execute(commandArgs, context);
    }
  }

  // Dispatch to registered command
  const command = registry.get(commandName);
  if (!command) {
    context.logger.error(`Unknown command: ${commandName}`);
    context.logger.info("Run `cvgen help` for a list of available commands.");
    return {
      message: `Unknown command: ${commandName}`,
      success: false,
      exitCode: 1,
    };
  }

  return command.execute(commandArgs, context);
}
