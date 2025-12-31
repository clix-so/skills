#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { installSkill } from "./commands/install";
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
  .command("install <skill>")
  .description("Install a specific agent skill")
  .option(
    "-c, --client <client>",
    "Target AI client (cursor, claude, vscode, amp, kiro, amazonq, codex, opencode, manual)"
  )
  .option("-p, --path <path>", "Custom installation path (default: .clix/skills)")
  .action(async (skill, options) => {
    try {
      await installSkill(skill, options);
    } catch (error: unknown) {
      console.error(chalk.red("Error installing skill:"), getErrorMessage(error));
      process.exit(1);
    }
  });

program.parse(process.argv);
