#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { installSkill } from './commands/install';

const program = new Command();

program
    .name('clix-agent-skills')
    .description('CLI to manage and install Clix Agent Skills')
    .version('1.0.0');

program
    .command('install <skill>')
    .description('Install a specific agent skill')
    .option('-c, --client <client>', 'Target AI client (cursor, claude, vscode, manual)')
    .option('-p, --path <path>', 'Custom installation path (default: .clix/skills)')
    .action(async (skill, options) => {
        try {
            await installSkill(skill, options);
        } catch (error: any) {
            console.error(chalk.red('Error installing skill:'), error.message);
            process.exit(1);
        }
    });

program.parse(process.argv);
