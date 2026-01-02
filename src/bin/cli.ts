#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { installSkill, installAllSkills } from "./commands/install";
import { version } from "../../package.json";

/**
 * Extracts error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

const program = new Command();

program
  .name("clix-agent-skills")
  .description("CLI to manage and install Clix Agent Skills")
  .version(version);

program
  .command("install [skill]")
  .description("Install agent skill(s)")
  .option(
    "-c, --client <client>",
    "Target AI client (cursor, claude, vscode, amp, kiro, amazonq, codex, opencode, manual)"
  )
  .option("-p, --path <path>", "Custom installation path (default: .clix/skills)")
  .option("-a, --all", "Install all available skills")
  .action(async (skill, options) => {
    try {
      if (options.all) {
        await installAllSkills(options);
      } else if (skill) {
        await installSkill(skill, options);
      } else {
        console.error(chalk.red("Error: Please specify a skill name or use --all flag"));
        process.exit(1);
      }
    } catch (error: unknown) {
      console.error(chalk.red("Error installing skill(s):"), getErrorMessage(error));
      process.exit(1);
    }
  });

program.parse(process.argv);
