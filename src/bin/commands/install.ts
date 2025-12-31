import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import ora from "ora";
import { configureMCP } from "../utils/mcp";

interface InstallOptions {
  client?: string;
  path?: string;
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
  let relativeDest = ".clix/skills";

  if (options.path) {
    relativeDest = options.path;
  } else if (options.client) {
    switch (options.client.toLowerCase()) {
      case "claude":
        relativeDest = ".claude/skills";
        break;
      case "cursor":
        relativeDest = ".cursor/skills";
        break;
      case "vscode":
        relativeDest = ".vscode/skills";
        break;
      case "codex":
        relativeDest = ".codex/skills";
        break;
      case "opencode":
        relativeDest = ".opencode/skill";
        break;
      case "letta":
        relativeDest = ".skills";
        break;
      case "goose":
        relativeDest = ".goose/skills";
        break;
      case "github":
      case "copilot":
        relativeDest = ".github/skills";
        break;
      case "amp":
        relativeDest = ".amp/skills";
        break;
      default:
        relativeDest = options.client.startsWith(".") ? `${options.client}/skills` : `.clix/skills`;
    }
  }

  const destPath = path.resolve(process.cwd(), relativeDest, skillName);

  // 3. Copy Files
  try {
    await fs.ensureDir(destPath);
    await fs.copy(skillSourcePath, destPath);
    spinner.succeed(`Skill files installed to ${chalk.green(relativeDest + "/" + skillName)}`);
  } catch (err: any) {
    spinner.fail(`Failed to copy skill files: ${err.message}`);
    throw err;
  }

  // 4. MCP Configuration
  try {
    await configureMCP(options.client);
  } catch (err: any) {
    console.warn(chalk.yellow(`MCP Configuration warning: ${err.message}`));
  }

  console.log(`\n${chalk.green("✔")} Skill ${chalk.bold(skillName)} is ready to use!`);
  console.log(`  - Docs: ${path.join(destPath, "SKILL.md")}`);
  console.log(`  - Instruct your agent to read these docs to start working.`);
}
