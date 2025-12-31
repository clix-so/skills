import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import chalk from 'chalk';
import inquirer from 'inquirer';

const CLIX_MCP_CONFIG = {
    "clix-mcp-server": {
        "command": "npx",
        "args": ["-y", "@clix-so/clix-mcp-server@latest"]
    }
};

export async function configureMCP(client?: string) {
    let targetClient = client;

    if (!targetClient) {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'client',
                message: 'Which AI client are you using?',
                choices: [
                    { name: 'Cursor', value: 'cursor' },
                    { name: 'Claude Desktop', value: 'claude' },
                    { name: 'VS Code', value: 'vscode' },
                    { name: 'Codex', value: 'codex' },
                    { name: 'OpenCode', value: 'opencode' },
                    { name: 'Letta', value: 'letta' },
                    { name: 'Goose', value: 'goose' },
                    { name: 'GitHub', value: 'github' },
                    { name: 'Amp', value: 'amp' },
                    { name: 'None / Manual', value: 'manual' }
                ]
            }
        ]);
        targetClient = answers.client;
    }

    if (targetClient === 'manual') {
        console.log(chalk.blue('Skipping automatic MCP configuration.'));
        return;
    }

    const configPath = getConfigPath(targetClient!);

    if (!configPath) {
        console.log(chalk.yellow(`Could not determine config path for ${targetClient}. skipping.`));
        return;
    }

    const nicePath = configPath.replace(os.homedir(), '~');
    console.log(chalk.blue(`Checking MCP config at ${nicePath}...`));

    if (!fs.existsSync(configPath)) {
        // Attempt to create if it's a known directory structure
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir) && targetClient !== 'cursor') { // Cursor usually creates its own dir, but we can verify
            // Safe to create dir?
        }
        // For now, confirm before creating new file
        const { create } = await inquirer.prompt([{
            type: 'confirm',
            name: 'create',
            message: `Config file not found at ${nicePath}. Create it?`,
            default: true
        }]);
        if (!create) return;

        await fs.ensureDir(path.dirname(configPath));
        await fs.writeJSON(configPath, { mcpServers: {} }, { spaces: 2 });
    }

    // Read config
    let config: any = {};
    try {
        config = await fs.readJSON(configPath);
    } catch (e) {
        console.log(chalk.red('Failed to parse existing config JSON.'));
        return;
    }

    if (!config.mcpServers) config.mcpServers = {};

    if (config.mcpServers['clix-mcp-server']) {
        console.log(chalk.green('✔ Clix MCP Server is already configured.'));
        return;
    }

    // Ask to inject
    const { inject } = await inquirer.prompt([{
        type: 'confirm',
        name: 'inject',
        message: `Add Clix MCP Server to ${nicePath}?`,
        default: true
    }]);

    if (inject) {
        config.mcpServers['clix-mcp-server'] = CLIX_MCP_CONFIG['clix-mcp-server'];
        await fs.writeJSON(configPath, config, { spaces: 2 });
        console.log(chalk.green(`✔ Added Clix MCP Server to configuration. Please restart ${targetClient}.`));
    }
}

function getConfigPath(client: string): string | null {
    const home = os.homedir();
    switch (client.toLowerCase()) {
        case 'cursor':
            // Check for project-level definition first
            const projectCursorPath = path.join(process.cwd(), '.cursor', 'mcp.json');
            if (fs.existsSync(projectCursorPath)) {
                return projectCursorPath;
            }
            // Fallback to global
            return path.join(home, '.cursor', 'mcp.json');

        case 'claude':
            if (process.platform === 'darwin') {
                return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
            } else if (process.platform === 'win32') {
                return path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
            }
            return null;

        case 'vscode':
            return path.join(home, '.vscode', 'mcp.json'); // Standard VS Code MCP path assumption

        default:
            return null;
    }
}
