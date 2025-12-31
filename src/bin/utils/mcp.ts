import path from "path";
import fs from "fs-extra";
import os from "os";
import chalk from "chalk";
import inquirer from "inquirer";
import * as TOML from "@iarna/toml";

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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
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
 */
function getClientConfig(client: string): ClientConfig | null {
  const home = os.homedir();

  switch (client.toLowerCase()) {
    case "cursor": {
      // Check for project-level definition first
      const projectCursorPath = path.join(process.cwd(), ".cursor", "mcp.json");
      if (fs.existsSync(projectCursorPath)) {
        return { path: projectCursorPath, configKey: "mcpServers", format: "json" };
      }
      // Fallback to global
      return {
        path: path.join(home, ".cursor", "mcp.json"),
        configKey: "mcpServers",
        format: "json",
      };
    }

    case "claude": {
      let configPath: string | null = null;
      if (process.platform === "darwin") {
        configPath = path.join(
          home,
          "Library",
          "Application Support",
          "Claude",
          "claude_desktop_config.json"
        );
      } else if (process.platform === "win32") {
        configPath = path.join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json");
      } else if (process.platform === "linux") {
        configPath = path.join(home, ".config", "Claude", "claude_desktop_config.json");
      }
      return configPath ? { path: configPath, configKey: "mcpServers", format: "json" } : null;
    }

    case "vscode":
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
      return {
        path: path.join(process.cwd(), ".kiro", "settings", "mcp.json"),
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
  const configPath = path.join(process.cwd(), "opencode.json");
  const nicePath = "opencode.json";
  console.log(chalk.blue(`Checking MCP config at ${nicePath}...`));

  let config: OpenCodeConfig = {};

  if (!fs.existsSync(configPath)) {
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
// Main Function
// ============================================================================

export async function configureMCP(client?: string): Promise<void> {
  let targetClient = client;

  if (!targetClient) {
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "client",
        message: "Which AI client are you using?",
        choices: [
          { name: "Cursor", value: "cursor" },
          { name: "Claude Desktop", value: "claude" },
          { name: "VS Code", value: "vscode" },
          { name: "Amp", value: "amp" },
          { name: "Kiro", value: "kiro" },
          { name: "Amazon Q", value: "amazonq" },
          { name: "Codex", value: "codex" },
          { name: "OpenCode", value: "opencode" },
          { name: "Letta", value: "letta" },
          { name: "Goose", value: "goose" },
          { name: "GitHub", value: "github" },
          { name: "None / Manual", value: "manual" },
        ],
      },
    ]);
    targetClient = answers.client;
  }

  if (targetClient === "manual") {
    console.log(chalk.blue("Skipping automatic MCP configuration."));
    return;
  }

  // Handle OpenCode separately (different JSON structure)
  if (targetClient === "opencode") {
    await configureOpenCode();
    return;
  }

  // Get client config
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
