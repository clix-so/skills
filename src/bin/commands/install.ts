import path from "path";
import os from "os";
import fs from "fs-extra";
import chalk from "chalk";
import ora from "ora";
import { configureMCP } from "../utils/mcp";

interface InstallOptions {
  client?: string;
  path?: string;
  global?: boolean;
  /**
   * Internal/testing flag: when true, skip MCP configuration step for this call.
   * `install --all` uses this to avoid prompting/writing config once per skill.
   */
  skipMCPConfig?: boolean;
}

/**
 * Extracts error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function installSkill(skillName: string, options: InstallOptions) {
  const spinner = ora(`Installing skill: ${chalk.bold(skillName)}`).start();

  // 1. Locate Skill in current package
  // Assuming 'skills' directory is at package root.
  // When running from dist/bin/cli.js, package root is ../../
  // Robustly find package root by looking for package.json
  let packageRoot = __dirname;
  while (!fs.existsSync(path.join(packageRoot, "package.json"))) {
    const parent = path.dirname(packageRoot);
    if (parent === packageRoot) {
      // Reached root without finding package.json, fallback to CWD or throw
      packageRoot = process.cwd();
      break;
    }
    packageRoot = parent;
  }

  // Verify skills directory exists
  let skillSourcePath = path.join(packageRoot, "skills", skillName);
  if (!fs.existsSync(skillSourcePath)) {
    // Fallback for development if skills is not in dist but in root
    // (Not needed if finding package.json correctly, but good for sanity)
    console.warn(chalk.yellow(`Skill not found at ${skillSourcePath}, trying CWD...`));
    skillSourcePath = path.resolve(process.cwd(), "skills", skillName);
  }

  if (!fs.existsSync(skillSourcePath)) {
    spinner.fail(`Skill ${chalk.bold(skillName)} not found locally.`);
    console.log(chalk.yellow(`Searching in: ${skillSourcePath}`));

    const skillsDir = path.join(packageRoot, "skills");
    if (fs.existsSync(skillsDir)) {
      console.log(chalk.yellow(`Available skills: ${fs.readdirSync(skillsDir).join(", ")}`));
    } else {
      console.log(chalk.yellow(`Skills directory not found at: ${skillsDir}`));
    }
    return;
  }

  // 2. Determine Destination
  let relativeDest = ".agent/skills";

  if (options.path) {
    relativeDest = options.path;
  } else if (options.client) {
    switch (options.client.toLowerCase()) {
      case "amazonq":
        relativeDest = ".amazonq/skills";
        break;
      case "amp":
        // Amp looks for workspace skills in `.agents/skills/` and user skills in `~/.config/agents/skills/`.
        // We map `--global` to the user-level location.
        relativeDest = options.global ? ".config/agents/skills" : ".agents/skills";
        break;
      case "claude":
      case "claude-code":
        // Claude Code uses the .claude/ folder convention, but MCP is configured via `claude mcp ...`
        relativeDest = ".claude/skills";
        break;
      case "codex":
        relativeDest = ".codex/skills";
        break;
      case "copilot":
      case "github":
        relativeDest = ".github/skills";
        break;
      case "cursor":
        relativeDest = ".cursor/skills";
        break;
      case "gemini":
        // Gemini CLI discovers project skills in `.gemini/skills/` and user skills in `~/.gemini/skills/`
        relativeDest = ".gemini/skills";
        break;
      case "antigravity":
        // Google Antigravity uses `.agent/skills` for workspace installs and
        // `~/.gemini/antigravity/skills` for global installs.
        relativeDest = options.global ? ".gemini/antigravity/skills" : ".agent/skills";
        break;
      case "letta":
        relativeDest = ".skills";
        break;
      case "goose":
        // Goose supports portable skill locations too:
        // - project: `./.agents/skills/`
        // - global : `~/.config/agents/skills/`
        // We default to the portable locations, but users can still override via --path.
        relativeDest = options.global ? ".config/agents/skills" : ".agents/skills";
        break;
      case "kiro":
        relativeDest = ".kiro/skills";
        break;
      case "opencode":
        relativeDest = ".opencode/skill";
        break;
      case "vscode":
        relativeDest = ".vscode/skills";
        break;
      default:
        relativeDest = options.client.startsWith(".")
          ? `${options.client}/skills`
          : `.agent/skills`;
    }
  }

  // Determine installation root: repo root (cwd) or system root (home directory)
  const installRoot = options.global ? os.homedir() : process.cwd();
  const destPath = path.resolve(installRoot, relativeDest, skillName);

  // Gemini note: by default we install to project scope (.gemini/skills).
  // If the user expects Gemini to see these skills in *any* project, they should use --global.
  if (
    options.client?.toLowerCase() === "gemini" &&
    !options.global &&
    !options.path &&
    skillName === "integration"
  ) {
    console.log(
      chalk.yellow(
        "Gemini note: skills were installed to this project's .gemini/skills. " +
          "To make skills available across all projects, re-run with --global (installs to ~/.gemini/skills)."
      )
    );
  }

  // 3. Copy Files
  try {
    await fs.ensureDir(destPath);
    await fs.copy(skillSourcePath, destPath);
    const installLocation = options.global
      ? `system root (${path.join(os.homedir(), relativeDest, skillName)})`
      : `repo root (${path.join(process.cwd(), relativeDest, skillName)})`;
    spinner.succeed(`Skill files installed to ${chalk.green(installLocation)}`);
  } catch (error: unknown) {
    spinner.fail(`Failed to copy skill files: ${getErrorMessage(error)}`);
    throw error;
  }

  // 4. MCP Configuration (always global/system root)
  if (!options.skipMCPConfig) {
    try {
      await configureMCP(options.client);
    } catch (error: unknown) {
      console.warn(chalk.yellow(`MCP Configuration warning: ${getErrorMessage(error)}`));
    }
  }

  console.log(`\n${chalk.green("✔")} Skill ${chalk.bold(skillName)} is ready to use!`);
  console.log(`  - Docs: ${path.join(destPath, "SKILL.md")}`);
  console.log(`  - Instruct your agent to read these docs to start working.`);
}

/**
 * Find all available skills in the skills directory
 */
async function findAllSkills(): Promise<string[]> {
  // Find package root (same logic as installSkill)
  let packageRoot = __dirname;
  while (!fs.existsSync(path.join(packageRoot, "package.json"))) {
    const parent = path.dirname(packageRoot);
    if (parent === packageRoot) {
      packageRoot = process.cwd();
      break;
    }
    packageRoot = parent;
  }

  const skillsDir = path.join(packageRoot, "skills");
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(skillsDir, entry.name, "SKILL.md")))
    .map((entry) => entry.name);
}

/**
 * Install all available skills
 */
export async function installAllSkills(options: InstallOptions) {
  const spinner = ora("Discovering available skills...").start();

  const skills = await findAllSkills();

  if (skills.length === 0) {
    spinner.fail("No skills found to install.");
    return;
  }

  spinner.succeed(`Found ${chalk.bold(skills.length)} skill(s): ${skills.join(", ")}`);
  console.log();

  let successCount = 0;
  let failCount = 0;

  for (const skillName of skills) {
    try {
      // Avoid configuring MCP once per skill. We'll do it once at the end.
      await installSkill(skillName, { ...options, skipMCPConfig: true });
      successCount++;
    } catch (error: unknown) {
      console.error(
        chalk.red(`\n✗ Failed to install ${chalk.bold(skillName)}: ${getErrorMessage(error)}`)
      );
      failCount++;
    }
  }

  // Configure MCP once per `--all` run (always global/system root)
  if (successCount > 0) {
    try {
      await configureMCP(options.client);
    } catch (error: unknown) {
      console.warn(chalk.yellow(`MCP Configuration warning: ${getErrorMessage(error)}`));
    }
  }

  console.log();
  if (failCount === 0) {
    console.log(
      chalk.green(`\n✔ Successfully installed all ${chalk.bold(successCount)} skill(s)!`)
    );
  } else {
    console.log(
      chalk.yellow(
        `\n⚠ Installed ${chalk.bold(successCount)} skill(s), ${chalk.bold(failCount)} failed.`
      )
    );
  }
}
