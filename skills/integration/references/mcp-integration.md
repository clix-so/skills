# Clix MCP Server

Clix MCP Server implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) to enable LLMs to search Clix documentation and SDK code.

## Integration Guide

### Install

**npm:**
```bash
npm i -g @clix-so/clix-mcp-server@latest
```

**yarn:**
```bash
yarn global add @clix-so/clix-mcp-server@latest
```

### Configure .mcp.json

Create or update the `.mcp.json` at your project root (or the configuration location your MCP client uses).

Recommended configuration using `npx`:

```json
{
  "mcpServers": {
    "clix-mcp-server": {
      "command": "npx",
      "args": ["-y", "@clix-so/clix-mcp-server@latest"]
    }
  }
}
```

### Use Clix MCP Server with Popular MCP Clients and IDEs

#### Android Studio

**Option 1: GitHub Copilot plugin in Android Studio**
1. Settings > Tools > GitHub Copilot > Model Context Protocol (MCP) > Configure.
2. Edit `mcp.json`:

```json
{ "mcpServers": { "clix-mcp-server": { "command": "npx", "args": ["-y", "@clix-so/clix-mcp-server@latest"] } } }
```

**Option 2: Using MCP Server plugin from JetBrains**
1. Install "MCP Server" plugin from JetBrains.
2. Configure client:

```json
{
  "mcpServers": {
    "clix-mcp-server": { "command": "npx", "args": ["-y", "@clix-so/clix-mcp-server@latest"] },
    "jetbrains": { "command": "npx", "args": ["-y", "@jetbrains/mcp-proxy"] }
  }
}
```

**Option 3: Gemini in Android Studio**
1. [Add an MCP server to Gemini](https://developer.android.com/studio/gemini/add-mcp-server).
2. Use standard configuration:

```json
{ "mcpServers": { "clix-mcp-server": { "command": "npx", "args": ["-y", "@clix-so/clix-mcp-server@latest"] } } }
```

#### Xcode

**Option 1: GitHub Copilot for Xcode**
1. Settings > MCP Configuration > Edit Config.
2. Add:

```json
{ "servers": { "clix-mcp-server": { "command": "npx", "args": ["-y", "@clix-so/clix-mcp-server@latest"] } } }
```

**Option 2: XcodeBuildMCP**
1. Add to your MCP client:

```json
{
  "mcpServers": {
    "clix-mcp-server": { "command": "npx", "args": ["-y", "@clix-so/clix-mcp-server@latest"] },
    "XcodeBuildMCP": { "command": "npx", "args": ["-y", "xcodebuildmcp@latest"] }
  }
}
```

#### Cursor

**Manual setup**
1. Cursor Settings > Tool & MCP > New MCP Server.
2. Paste JSON and restart:

```json
{ "mcpServers": { "clix-mcp-server": { "command": "npx", "args": ["-y", "@clix-so/clix-mcp-server@latest"] } } }
```

#### Amazon Q

**Manual setup**
1. Open `~/.aws/amazonq/agents/default.json`.
2. Add to `mcpServers`:

```json
"mcpServers": {
  "clix-mcp-server": {
    "command": "npx",
    "args": ["-y", "@clix-so/clix-mcp-server@latest"]
  }
}
```

#### Google Antigravity

**Manual setup**
1. Agent tab > ellipsis (...) > MCP Server > Manage MCP Servers.
2. Add to `mcp_config.json`:

```json
{ "mcpServers": { "clix-mcp-server": { "command": "npx", "args": ["-y", "@clix-so/clix-mcp-server@latest"] } } }
```

#### VS Code

**Manual setup**
1. Open `~/.vscode/mcp.json`.
2. Paste JSON and restart:

```json
{ "mcpServers": { "clix-mcp-server": { "command": "npx", "args": ["-y", "@clix-so/clix-mcp-server@latest"] } } }
```

#### Claude Code CLI

**Command Line:**
```bash
claude mcp add --transport stdio clix-mcp-server -- npx -y @clix-so/clix-mcp-server@latest
```

**Marketplace:**
```bash
/plugin marketplace add clix-so/clix-mcp-server
```

#### Codex CLI

**Setup**
1. Open `~/.codex/config.toml`.
2. Add and restart:

```toml
[mcp_servers]
  [mcp_servers.clix]
  command = "npx"
  args = ["-y", "@clix-so/clix-mcp-server@latest"]
```

#### Kiro CLI

**Setup**
1. Open `.kiro/settings/mcp.json`.
2. Add:

```json
{ "mcpServers": { "clix-mcp-server": { "command": "npx", "args": ["-y", "@clix-so/clix-mcp-server@latest"] } } }
```

#### Claude Desktop App

**Setup**
1. Open config (`~/Library/Application Support/Claude/claude_desktop_config.json` or `%APPDATA%\\Claude\\claude_desktop_config.json`).
2. Add and restart:

```json
{ "mcpServers": { "clix-mcp-server": { "command": "npx", "args": ["-y", "@clix-so/clix-mcp-server@latest"] } } }
```
