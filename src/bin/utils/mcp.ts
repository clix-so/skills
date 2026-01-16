import path from "path";
import fs from "fs-extra";
import os from "os";
import chalk from "chalk";
import inquirer from "inquirer";
import * as TOML from "@iarna/toml";
import { spawnSync } from "child_process";
import { getErrorMessage } from "./errors";

// ============================================================================
// Type Definitions
// ============================================================================

interface MCPServerEntry {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface StandardMCPConfig {
  mcpServers?: Record<string, MCPServerEntry>;
  [key: string]: unknown;
}

interface AmpMCPConfig {
  "amp.mcpServers"?: Record<string, MCPServerEntry>;
  [key: string]: unknown;
}

interface CodexTOMLConfig {
  mcp_servers?: Record<string, MCPServerEntry>;
  [key: string]: unknown;
}

type MCPConfig = StandardMCPConfig | AmpMCPConfig;

type ConfigFormat = "json" | "toml";

interface ClientConfig {
  path: string;
  configKey: "mcpServers" | "amp.mcpServers" | "mcp_servers";
  format: ConfigFormat;
}

// ============================================================================
// Constants
// ============================================================================

const CLIX_MCP_SERVER_ENTRY: MCPServerEntry = {
  command: "npx",
  args: ["-y", "@clix-so/clix-mcp-server@latest"],
};

const CLAUDE_CODE_MCP_ADD_ARGS = [
  "mcp",
  "add",
  "--transport",
  "stdio",
  "clix-mcp-server",
  "--",
  "npx",
  "-y",
  "@clix-so/clix-mcp-server@latest",
];

function hasClixServerInClaudeMcpListOutput(output: string): boolean {
  return output.toLowerCase().includes("clix-mcp-server");
}

/**
 * Configure MCP for Claude Code using the `claude` CLI (no config file editing).
 */
async function configureClaudeCode(): Promise<void> {
  console.log(chalk.blue("Checking MCP config via Claude Code CLI (`claude mcp`)..."));

  // Verify Claude CLI exists and supports MCP.
  const helpRes = spawnSync("claude", ["mcp", "--help"], { encoding: "utf8" });
  if (helpRes.error) {
    console.log(
      chalk.yellow(
        `Could not run Claude CLI (${getErrorMessage(helpRes.error)}). Skipping MCP configuration.`
      )
    );
    return;
  }
  if (helpRes.status !== 0) {
    console.log(
      chalk.yellow(
        "Claude CLI does not appear to support `claude mcp`. Skipping MCP configuration."
      )
    );
    return;
  }

  // Best-effort idempotency: if list works and already contains the server, skip.
  const listRes = spawnSync("claude", ["mcp", "list"], { encoding: "utf8" });
  const listOut = `${listRes.stdout ?? ""}\n${listRes.stderr ?? ""}`;
  if (!listRes.error && listRes.status === 0 && hasClixServerInClaudeMcpListOutput(listOut)) {
    console.log(chalk.green("✔ Clix MCP Server is already configured."));
    return;
  }

  const addRes = spawnSync("claude", CLAUDE_CODE_MCP_ADD_ARGS, { encoding: "utf8" });
  if (addRes.error || addRes.status !== 0) {
    const out = `${addRes.stdout ?? ""}\n${addRes.stderr ?? ""}`.trim();
    console.log(
      chalk.yellow(
        `Failed to configure MCP via Claude Code CLI. ${
          out ? `Output:\n${out}` : "No output captured."
        }`
      )
    );
    return;
  }

  console.log(chalk.green("✔ Added Clix MCP Server to configuration. Please restart claude."));
}

function isClaudeCodeClient(client: string): boolean {
  const c = client.toLowerCase();
  return (
    c === "claude" ||
    c === "claude_code" ||
    c === "claude-code" ||
    c === "claudecode" ||
    c === "claude code"
  );
}

/**
 * Gets the MCP servers object from JSON config based on client type
 */
function getMcpServersFromConfig(
  config: MCPConfig,
  configKey: "mcpServers" | "amp.mcpServers"
): Record<string, MCPServerEntry> | undefined {
  if (configKey === "amp.mcpServers") {
    return (config as AmpMCPConfig)["amp.mcpServers"];
  }
  return (config as StandardMCPConfig).mcpServers;
}

/**
 * Sets the MCP servers object in JSON config based on client type
 */
function setMcpServersInConfig(
  config: MCPConfig,
  configKey: "mcpServers" | "amp.mcpServers",
  servers: Record<string, MCPServerEntry>
): void {
  if (configKey === "amp.mcpServers") {
    (config as AmpMCPConfig)["amp.mcpServers"] = servers;
  } else {
    (config as StandardMCPConfig).mcpServers = servers;
  }
}

/**
 * Creates empty JSON config structure based on client type
 */
function createEmptyConfig(configKey: "mcpServers" | "amp.mcpServers"): MCPConfig {
  if (configKey === "amp.mcpServers") {
    return { "amp.mcpServers": {} };
  }
  return { mcpServers: {} };
}

/**
 * Gets config path, key, and format for a specific client
 * MCP configuration is always global (system root)
 */
function getClientConfig(client: string): ClientConfig | null {
  const home = os.homedir();

  switch (client.toLowerCase()) {
    case "gemini":
      // Gemini CLI stores MCP server configuration in `~/.gemini/settings.json` (user scope)
      return {
        path: path.join(home, ".gemini", "settings.json"),
        configKey: "mcpServers",
        format: "json",
      };

    case "antigravity":
    case "google-antigravity":
    case "google_antigravity":
      // Google Antigravity stores global skills under ~/.gemini/antigravity/skills/
      // and follows the Gemini-style JSON config for MCP servers.
      return {
        path: path.join(home, ".gemini", "antigravity", "settings.json"),
        configKey: "mcpServers",
        format: "json",
      };

    case "cursor": {
      // MCP is always configured globally
      return {
        path: path.join(home, ".cursor", "mcp.json"),
        configKey: "mcpServers",
        format: "json",
      };
    }

    // GitHub Copilot runs inside VS Code, so its MCP configuration lives in VS Code's MCP config.
    // We accept `github` / `copilot` as aliases and write to the same file as `vscode`.
    case "vscode":
    case "github":
    case "copilot":
    case "github-copilot":
    case "github copilot":
      return {
        path: path.join(home, ".vscode", "mcp.json"),
        configKey: "mcpServers",
        format: "json",
      };

    case "amp": {
      let ampConfigPath: string;
      if (process.platform === "win32") {
        ampConfigPath = path.join(
          process.env.USERPROFILE || home,
          ".config",
          "amp",
          "settings.json"
        );
      } else {
        ampConfigPath = path.join(home, ".config", "amp", "settings.json");
      }
      return { path: ampConfigPath, configKey: "amp.mcpServers", format: "json" };
    }

    case "kiro":
      // MCP is always configured globally
      return {
        path: path.join(home, ".kiro", "settings", "mcp.json"),
        configKey: "mcpServers",
        format: "json",
      };

    case "amazonq":
      return {
        path: path.join(home, ".aws", "amazonq", "agents", "default.json"),
        configKey: "mcpServers",
        format: "json",
      };

    case "codex":
      return {
        path: path.join(home, ".codex", "config.toml"),
        configKey: "mcp_servers",
        format: "toml",
      };

    default:
      return null;
  }
}

// ============================================================================
// TOML Configuration (Codex)
// ============================================================================

async function configureCodexTOML(configPath: string): Promise<void> {
  const nicePath = configPath.replace(os.homedir(), "~");
  console.log(chalk.blue(`Checking MCP config at ${nicePath}...`));

  let config: CodexTOMLConfig = {};

  if (!fs.existsSync(configPath)) {
    if (process.env.CI === "true") {
      console.log(chalk.yellow("Skipping config creation in CI environment."));
      return;
    }

    const { create } = await inquirer.prompt([
      {
        type: "confirm",
        name: "create",
        message: `Config file not found at ${nicePath}. Create it?`,
        default: true,
      },
    ]);

    if (!create) {
      console.log(chalk.yellow("Skipping MCP configuration. You can configure manually later."));
      return;
    }

    try {
      await fs.ensureDir(path.dirname(configPath));
      config = { mcp_servers: {} };
      await fs.writeFile(configPath, TOML.stringify(config as TOML.JsonMap), "utf-8");
      console.log(chalk.green(`✔ Created config file at ${nicePath}`));
    } catch (error: unknown) {
      console.log(chalk.red(`Failed to create config file: ${getErrorMessage(error)}`));
      return;
    }
  } else {
    // Read existing TOML config
    try {
      const content = await fs.readFile(configPath, "utf-8");
      config = TOML.parse(content) as CodexTOMLConfig;
    } catch (error: unknown) {
      console.log(chalk.red(`Failed to parse existing config TOML: ${getErrorMessage(error)}`));
      return;
    }
  }

  // Initialize mcp_servers if not present
  if (!config.mcp_servers) {
    config.mcp_servers = {};
  }

  // Check if already configured
  if (config.mcp_servers["clix-mcp-server"]) {
    console.log(chalk.green("✔ Clix MCP Server is already configured."));
    return;
  }

  // Ask to inject
  if (process.env.CI === "true") {
    console.log(chalk.yellow("Skipping MCP server injection in CI environment."));
    return;
  }

  const { inject } = await inquirer.prompt([
    {
      type: "confirm",
      name: "inject",
      message: `Add Clix MCP Server to ${nicePath}?`,
      default: true,
    },
  ]);

  if (inject) {
    config.mcp_servers["clix-mcp-server"] = CLIX_MCP_SERVER_ENTRY;
    await fs.writeFile(configPath, TOML.stringify(config as TOML.JsonMap), "utf-8");
    console.log(chalk.green(`✔ Added Clix MCP Server to configuration. Please restart codex.`));
  }
}

// ============================================================================
// OpenCode Configuration (Different JSON structure)
// ============================================================================

interface OpenCodeConfig {
  $schema?: string;
  mcp?: Record<
    string,
    {
      type: string;
      command: string[];
      enabled: boolean;
    }
  >;
  [key: string]: unknown;
}

async function configureOpenCode(): Promise<void> {
  // MCP is always configured globally
  const configPath = path.join(os.homedir(), "opencode.json");
  const nicePath = path.join("~", "opencode.json");
  console.log(chalk.blue(`Checking MCP config at ${nicePath}...`));

  let config: OpenCodeConfig = {};

  if (!fs.existsSync(configPath)) {
    if (process.env.CI === "true") {
      console.log(chalk.yellow("Skipping config creation in CI environment."));
      return;
    }

    const { create } = await inquirer.prompt([
      {
        type: "confirm",
        name: "create",
        message: `Config file not found at ${nicePath}. Create it?`,
        default: true,
      },
    ]);

    if (!create) {
      console.log(chalk.yellow("Skipping MCP configuration. You can configure manually later."));
      return;
    }

    try {
      config = {
        $schema: "https://opencode.ai/config.json",
        mcp: {},
      };
      await fs.writeJSON(configPath, config, { spaces: 2 });
      console.log(chalk.green(`✔ Created config file at ${nicePath}`));
    } catch (error: unknown) {
      console.log(chalk.red(`Failed to create config file: ${getErrorMessage(error)}`));
      return;
    }
  } else {
    try {
      config = await fs.readJSON(configPath);
    } catch (error: unknown) {
      console.log(chalk.red(`Failed to parse existing config JSON: ${getErrorMessage(error)}`));
      return;
    }
  }

  // Initialize mcp if not present
  if (!config.mcp) {
    config.mcp = {};
  }

  // Check if already configured
  if (config.mcp["clix-mcp-server"]) {
    console.log(chalk.green("✔ Clix MCP Server is already configured."));
    return;
  }

  // Ask to inject
  if (process.env.CI === "true") {
    console.log(chalk.yellow("Skipping MCP server injection in CI environment."));
    return;
  }

  const { inject } = await inquirer.prompt([
    {
      type: "confirm",
      name: "inject",
      message: `Add Clix MCP Server to ${nicePath}?`,
      default: true,
    },
  ]);

  if (inject) {
    config.mcp["clix-mcp-server"] = {
      type: "local",
      command: ["npx", "-y", "@clix-so/clix-mcp-server@latest"],
      enabled: true,
    };
    await fs.writeJSON(configPath, config, { spaces: 2 });
    console.log(chalk.green(`✔ Added Clix MCP Server to configuration. Please restart opencode.`));
  }
}

// ============================================================================
// Factory Configuration (supports user + project scopes)
// ============================================================================

interface FactoryConfigTarget {
  scope: "user" | "project";
  path: string;
}

async function configureFactoryConfig(configTarget: FactoryConfigTarget): Promise<void> {
  const { scope, path: configPath } = configTarget;
  const nicePath =
    scope === "project"
      ? path.relative(process.cwd(), configPath) || configPath
      : configPath.replace(os.homedir(), "~");

  console.log(chalk.blue(`Checking MCP config at ${nicePath} (${scope} scope)...`));

  if (!fs.existsSync(configPath)) {
    if (process.env.CI === "true") {
      console.log(chalk.yellow(`Skipping config creation for ${scope} scope in CI environment.`));
      return;
    }

    const { create } = await inquirer.prompt([
      {
        type: "confirm",
        name: "create",
        message: `Config file not found at ${nicePath}. Create it?`,
        default: true,
      },
    ]);

    if (!create) {
      console.log(chalk.yellow(`Skipping MCP configuration for ${scope} scope.`));
      return;
    }

    try {
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJSON(configPath, createEmptyConfig("mcpServers"), { spaces: 2 });
      console.log(chalk.green(`✔ Created config file at ${nicePath}`));
    } catch (error: unknown) {
      console.log(
        chalk.red(`Failed to create config file (${scope} scope): ${getErrorMessage(error)}`)
      );
      return;
    }
  }

  let config: MCPConfig;
  try {
    config = await fs.readJSON(configPath);
  } catch (error: unknown) {
    console.log(chalk.red(`Failed to parse existing config JSON: ${getErrorMessage(error)}`));
    return;
  }

  let mcpServers = getMcpServersFromConfig(config, "mcpServers");
  if (!mcpServers) {
    mcpServers = {};
    setMcpServersInConfig(config, "mcpServers", mcpServers);
  }

  if (mcpServers["clix-mcp-server"]) {
    console.log(chalk.green(`✔ Clix MCP Server is already configured for ${scope} scope.`));
    return;
  }

  if (process.env.CI === "true") {
    console.log(
      chalk.yellow(`Skipping MCP server injection for ${scope} scope in CI environment.`)
    );
    return;
  }

  const { inject } = await inquirer.prompt([
    {
      type: "confirm",
      name: "inject",
      message: `Add Clix MCP Server to ${nicePath}?`,
      default: true,
    },
  ]);

  if (inject) {
    mcpServers["clix-mcp-server"] = CLIX_MCP_SERVER_ENTRY;
    setMcpServersInConfig(config, "mcpServers", mcpServers);
    await fs.writeJSON(configPath, config, { spaces: 2 });
    console.log(chalk.green(`✔ Added Clix MCP Server to configuration (${scope} scope).`));
  }
}

async function configureFactory(): Promise<void> {
  const targets: FactoryConfigTarget[] = [
    { scope: "user", path: path.join(os.homedir(), ".factory", "mcp.json") },
    { scope: "project", path: path.join(process.cwd(), ".factory", "mcp.json") },
  ];

  for (const target of targets) {
    await configureFactoryConfig(target);
  }
}

// ============================================================================
// Main Function
// ============================================================================

export async function configureMCP(client?: string): Promise<void> {
  let targetClient = client;

  if (!targetClient) {
    if (process.env.CI === "true") {
      console.log(chalk.yellow("No client specified in CI environment."));
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "client",
        message: "Which AI client are you using?",
        choices: [
          { name: "Amazon Q", value: "amazonq" },
          { name: "Amp", value: "amp" },
          { name: "Google Antigravity", value: "antigravity" },
          { name: "Claude Code", value: "claude" },
          { name: "Codex", value: "codex" },
          { name: "Cursor", value: "cursor" },
          { name: "Factory", value: "factory" },
          { name: "Gemini CLI", value: "gemini" },
          { name: "GitHub", value: "github" },
          { name: "Goose", value: "goose" },
          { name: "Kiro", value: "kiro" },
          { name: "Letta", value: "letta" },
          { name: "OpenCode", value: "opencode" },
          { name: "VS Code", value: "vscode" },
          { name: "None / Manual", value: "manual" },
        ],
      },
    ]);
    targetClient = answers.client;
  }

  if (!targetClient) {
    console.log(chalk.yellow("No client selected. Skipping MCP configuration."));
    return;
  }

  if (targetClient === "manual") {
    console.log(chalk.blue("Skipping automatic MCP configuration."));
    return;
  }

  // Factory supports user + project scoped config files; configure both.
  if (targetClient === "factory") {
    await configureFactory();
    return;
  }

  // Claude Code is configured via the `claude` CLI (no file editing).
  if (targetClient && isClaudeCodeClient(targetClient)) {
    await configureClaudeCode();
    return;
  }

  // Handle OpenCode separately (different JSON structure)
  if (targetClient === "opencode") {
    await configureOpenCode();
    return;
  }

  // Get client config (MCP is always global)
  const clientConfig = getClientConfig(targetClient!);

  if (!clientConfig) {
    console.log(chalk.yellow(`Could not determine config path for ${targetClient}. Skipping.`));
    return;
  }

  // Handle TOML format (Codex)
  if (clientConfig.format === "toml") {
    await configureCodexTOML(clientConfig.path);
    return;
  }

  // Handle JSON format (all other clients)
  const { path: configPath, configKey } = clientConfig;
  const nicePath = configPath.replace(os.homedir(), "~");
  console.log(chalk.blue(`Checking MCP config at ${nicePath}...`));

  if (!fs.existsSync(configPath)) {
    if (process.env.CI === "true") {
      console.log(chalk.yellow("Skipping config creation in CI environment."));
      return;
    }

    const { create } = await inquirer.prompt([
      {
        type: "confirm",
        name: "create",
        message: `Config file not found at ${nicePath}. Create it?`,
        default: true,
      },
    ]);

    if (!create) {
      console.log(chalk.yellow("Skipping MCP configuration. You can configure manually later."));
      return;
    }

    try {
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJSON(
        configPath,
        createEmptyConfig(configKey as "mcpServers" | "amp.mcpServers"),
        { spaces: 2 }
      );
      console.log(chalk.green(`✔ Created config file at ${nicePath}`));
    } catch (error: unknown) {
      console.log(chalk.red(`Failed to create config file: ${getErrorMessage(error)}`));
      return;
    }
  }

  // Read config
  let config: MCPConfig;
  try {
    config = await fs.readJSON(configPath);
  } catch (error: unknown) {
    console.log(chalk.red(`Failed to parse existing config JSON: ${getErrorMessage(error)}`));
    return;
  }

  // Get or create mcpServers object
  let mcpServers = getMcpServersFromConfig(config, configKey as "mcpServers" | "amp.mcpServers");
  if (!mcpServers) {
    mcpServers = {};
    setMcpServersInConfig(config, configKey as "mcpServers" | "amp.mcpServers", mcpServers);
  }

  if (mcpServers["clix-mcp-server"]) {
    console.log(chalk.green("✔ Clix MCP Server is already configured."));
    return;
  }

  // Ask to inject
  if (process.env.CI === "true") {
    console.log(chalk.yellow("Skipping MCP server injection in CI environment."));
    return;
  }

  const { inject } = await inquirer.prompt([
    {
      type: "confirm",
      name: "inject",
      message: `Add Clix MCP Server to ${nicePath}?`,
      default: true,
    },
  ]);

  if (inject) {
    mcpServers["clix-mcp-server"] = CLIX_MCP_SERVER_ENTRY;
    setMcpServersInConfig(config, configKey as "mcpServers" | "amp.mcpServers", mcpServers);
    await fs.writeJSON(configPath, config, { spaces: 2 });
    console.log(
      chalk.green(`✔ Added Clix MCP Server to configuration. Please restart ${targetClient}.`)
    );
  }
}
