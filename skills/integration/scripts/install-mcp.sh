#!/usr/bin/env bash
#
# Clix MCP Server Installer
#
# Usage:
#   bash scripts/install-mcp.sh
#

set -euo pipefail

BLUE='\033[34m'
GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
RESET='\033[0m'

log() {
  printf "%b\n" "$1"
}

# Detect platform
detect_platform() {
  case "$(uname -s)" in
    Darwin*) echo "darwin" ;;
    Linux*) echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*) echo "win32" ;;
    *) echo "unknown" ;;
  esac
}

# Get config path for different clients
get_config_path() {
  local client=$1
  local home="${HOME:-$HOME}"
  local platform=$(detect_platform)

  case "$client" in
    codex)
      echo "${home}/.codex/config.toml"
      ;;
    cursor)
      # Check project-level first
      if [ -f ".cursor/mcp.json" ]; then
        echo ".cursor/mcp.json"
      else
        echo "${home}/.cursor/mcp.json"
      fi
      ;;
    claude)
      if [ "$platform" = "darwin" ]; then
        echo "${home}/Library/Application Support/Claude/claude_desktop_config.json"
      elif [ "$platform" = "win32" ]; then
        echo "${APPDATA:-}/Claude/claude_desktop_config.json"
      else
        echo "${home}/.config/claude/claude_desktop_config.json"
      fi
      ;;
    vscode)
      echo "${home}/.vscode/mcp.json"
      ;;
    amp)
      # Amp uses VS Code settings.json format
      # Check workspace settings first, then user settings
      if [ -f ".vscode/settings.json" ]; then
        echo ".vscode/settings.json"
      elif [ -f "${home}/.vscode/settings.json" ]; then
        echo "${home}/.vscode/settings.json"
      else
        # Default to workspace settings
        echo ".vscode/settings.json"
      fi
      ;;
    opencode)
      # OpenCode uses opencode.json or opencode.jsonc in project root
      # Check for .jsonc first (preferred), then .json
      if [ -f "opencode.jsonc" ]; then
        echo "opencode.jsonc"
      elif [ -f "opencode.json" ]; then
        echo "opencode.json"
      else
        # Default to .jsonc
        echo "opencode.jsonc"
      fi
      ;;
    *)
      echo ""
      ;;
  esac
}

# Configure MCP for Codex (TOML format)
configure_codex() {
  local config_path="$1"
  local config_dir=$(dirname "$config_path")

  mkdir -p "$config_dir"

  if [ ! -f "$config_path" ]; then
    cat > "$config_path" <<'EOF'
[mcp_servers]
EOF
    log "${GREEN}✔ Created Codex config file${RESET}"
  fi

  # Check if already configured
  if grep -q "clix-mcp-server" "$config_path" 2>/dev/null; then
    log "${GREEN}✔ Clix MCP Server already configured in Codex${RESET}"
    return 0
  fi

  # If user previously configured Codex under a different name (e.g. "clix"),
  # tools will appear as "clix:*" instead of the expected "clix-mcp-server:*".
  # We add the correct server name, but also warn.
  if grep -q "\[mcp_servers\.clix\]" "$config_path" 2>/dev/null && \
     grep -q "@clix-so/clix-mcp-server" "$config_path" 2>/dev/null; then
    log "${YELLOW}⚠️  Found an existing Codex MCP entry named \"clix\".${RESET}"
    log "${YELLOW}   This makes tools show up as \"clix:*\" (not \"clix-mcp-server:*\").${RESET}"
    log "${YELLOW}   Adding the correct \"clix-mcp-server\" entry now.${RESET}"
  fi

  # Add configuration
  if grep -q "\[mcp_servers\]" "$config_path"; then
    # Append to existing [mcp_servers] section
    cat >> "$config_path" <<'EOF'

  [mcp_servers."clix-mcp-server"]
  command = "npx"
  args = ["-y", "@clix-so/clix-mcp-server@latest"]
EOF
  else
    # Create new section
    cat >> "$config_path" <<'EOF'
[mcp_servers]
  [mcp_servers."clix-mcp-server"]
  command = "npx"
  args = ["-y", "@clix-so/clix-mcp-server@latest"]
EOF
  fi

  log "${GREEN}✔ Configured Clix MCP Server in Codex config${RESET}"
}

# Configure MCP for Amp (uses amp.mcpServers in VS Code settings.json)
configure_amp() {
  local config_path="$1"
  local config_dir=$(dirname "$config_path")

  mkdir -p "$config_dir"

  if [ ! -f "$config_path" ]; then
    echo '{}' > "$config_path"
    log "${GREEN}✔ Created Amp settings file${RESET}"
  fi

  # Check if already configured
  if grep -q "clix-mcp-server" "$config_path" 2>/dev/null; then
    log "${GREEN}✔ Clix MCP Server already configured in Amp${RESET}"
    return 0
  fi

  # Use node to safely update JSON
  if command -v node &> /dev/null; then
    node <<EOF
const fs = require('fs');
const path = '$config_path';
let config = {};
try {
  const content = fs.readFileSync(path, 'utf8');
  config = JSON.parse(content);
} catch (e) {
  config = {};
}
if (!config['amp.mcpServers']) config['amp.mcpServers'] = {};
config['amp.mcpServers']['clix-mcp-server'] = {
  command: 'npx',
  args: ['-y', '@clix-so/clix-mcp-server@latest']
};
fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
EOF
    log "${GREEN}✔ Configured Clix MCP Server in Amp${RESET}"
  else
    log "${YELLOW}⚠️  Node.js not found. Please manually add to $config_path:${RESET}"
    log "${BLUE}{${RESET}"
    log "${BLUE}  \"amp.mcpServers\": {${RESET}"
    log "${BLUE}    \"clix-mcp-server\": {${RESET}"
    log "${BLUE}      \"command\": \"npx\",${RESET}"
    log "${BLUE}      \"args\": [\"-y\", \"@clix-so/clix-mcp-server@latest\"]${RESET}"
    log "${BLUE}    }${RESET}"
    log "${BLUE}  }${RESET}"
    log "${BLUE}}${RESET}"
  fi
}

# Configure MCP for OpenCode (uses opencode.json/jsonc with mcp section)
configure_opencode() {
  local config_path="$1"

  if [ ! -f "$config_path" ]; then
    # Create new opencode.jsonc file
    cat > "$config_path" <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {}
}
EOF
    log "${GREEN}✔ Created OpenCode config file${RESET}"
  fi

  # Check if already configured
  if grep -q "clix-mcp-server" "$config_path" 2>/dev/null; then
    log "${GREEN}✔ Clix MCP Server already configured in OpenCode${RESET}"
    return 0
  fi

  # Use node to safely update JSON/JSONC
  if command -v node &> /dev/null; then
    node <<EOF
const fs = require('fs');
const path = '$config_path';
let content = fs.readFileSync(path, 'utf8');
// Remove comments for JSONC parsing (simple approach)
let jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
let config = JSON.parse(jsonContent);
if (!config.mcp) config.mcp = {};
config.mcp['clix-mcp-server'] = {
  type: 'local',
  command: ['npx', '-y', '@clix-so/clix-mcp-server@latest'],
  enabled: true
};
// Write back as JSONC if original was .jsonc, otherwise JSON
const isJsonc = path.endsWith('.jsonc');
fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
EOF
    log "${GREEN}✔ Configured Clix MCP Server in OpenCode${RESET}"
  else
    log "${YELLOW}⚠️  Node.js not found. Please manually add to $config_path:${RESET}"
    log "${BLUE}{${RESET}"
    log "${BLUE}  \"mcp\": {${RESET}"
    log "${BLUE}    \"clix-mcp-server\": {${RESET}"
    log "${BLUE}      \"type\": \"local\",${RESET}"
    log "${BLUE}      \"command\": [\"npx\", \"-y\", \"@clix-so/clix-mcp-server@latest\"],${RESET}"
    log "${BLUE}      \"enabled\": true${RESET}"
    log "${BLUE}    }${RESET}"
    log "${BLUE}  }${RESET}"
    log "${BLUE}}${RESET}"
  fi
}

# Configure MCP for JSON-based clients
configure_json_client() {
  local config_path="$1"
  local config_dir=$(dirname "$config_path")

  mkdir -p "$config_dir"

  if [ ! -f "$config_path" ]; then
    echo '{"mcpServers": {}}' > "$config_path"
    log "${GREEN}✔ Created config file${RESET}"
  fi

  # Check if already configured
  if grep -q "clix-mcp-server" "$config_path" 2>/dev/null; then
    log "${GREEN}✔ Clix MCP Server already configured${RESET}"
    return 0
  fi

  # Use node to safely update JSON
  if command -v node &> /dev/null; then
    node <<EOF
const fs = require('fs');
const path = '$config_path';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
if (!config.mcpServers) config.mcpServers = {};
config.mcpServers['clix-mcp-server'] = {
  command: 'npx',
  args: ['-y', '@clix-so/clix-mcp-server@latest']
};
fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
EOF
    log "${GREEN}✔ Configured Clix MCP Server${RESET}"
  else
    log "${YELLOW}⚠️  Node.js not found. Please manually add to $config_path:${RESET}"
    log "${BLUE}{${RESET}"
    log "${BLUE}  \"mcpServers\": {${RESET}"
    log "${BLUE}    \"clix-mcp-server\": {${RESET}"
    log "${BLUE}      \"command\": \"npx\",${RESET}"
    log "${BLUE}      \"args\": [\"-y\", \"@clix-so/clix-mcp-server@latest\"]${RESET}"
    log "${BLUE}    }${RESET}"
    log "${BLUE}  }${RESET}"
    log "${BLUE}}${RESET}"
  fi
}

# Auto-detect client
detect_client() {
  # Check for OpenCode (check for opencode.json/jsonc or opencode command)
  if [ -f "opencode.json" ] || [ -f "opencode.jsonc" ] || command -v opencode &> /dev/null; then
    echo "opencode"
    return
  fi

  # Check for Amp (check for amp.mcpServers in settings.json or amp command)
  if command -v amp &> /dev/null || \
     grep -q "amp.mcpServers" ".vscode/settings.json" 2>/dev/null || \
     grep -q "amp.mcpServers" "${HOME}/.vscode/settings.json" 2>/dev/null; then
    echo "amp"
    return
  fi

  # Check for Codex
  if [ -f "${HOME}/.codex/config.toml" ] || command -v codex &> /dev/null; then
    echo "codex"
    return
  fi

  # Check for Cursor
  if [ -f "${HOME}/.cursor/mcp.json" ] || [ -f ".cursor/mcp.json" ]; then
    echo "cursor"
    return
  fi

  # Check for Claude Desktop
  if [ -f "${HOME}/Library/Application Support/Claude/claude_desktop_config.json" ] 2>/dev/null || \
     [ -f "${APPDATA:-}/Claude/claude_desktop_config.json" ] 2>/dev/null; then
    echo "claude"
    return
  fi

  # Check for VS Code
  if [ -f "${HOME}/.vscode/mcp.json" ]; then
    echo "vscode"
    return
  fi

  echo "unknown"
}

log "${BLUE}📦 Installing Clix MCP Server...${RESET}"

# Check for npm
if ! command -v npm &> /dev/null; then
  log "${RED}❌ npm is not installed or not in PATH.${RESET}"
  log "${YELLOW}Please install Node.js and npm first: https://nodejs.org/${RESET}"
  exit 1
fi

# Install package (using npx, no need for global install)
log "${BLUE}Verifying @clix-so/clix-mcp-server is available...${RESET}"
if npm view @clix-so/clix-mcp-server@latest version &> /dev/null; then
  log "${GREEN}✅ Package is available${RESET}"
else
  log "${RED}❌ Package not found on npm${RESET}"
  exit 1
fi

# Auto-detect and configure
log "${BLUE}🔍 Detecting MCP client...${RESET}"
detected_client=$(detect_client)

if [ "$detected_client" != "unknown" ]; then
  log "${GREEN}Detected: $detected_client${RESET}"
  config_path=$(get_config_path "$detected_client")

  if [ -n "$config_path" ]; then
    log "${BLUE}Configuring MCP server for $detected_client...${RESET}"

    if [ "$detected_client" = "codex" ]; then
      configure_codex "$config_path"
    elif [ "$detected_client" = "amp" ]; then
      configure_amp "$config_path"
    elif [ "$detected_client" = "opencode" ]; then
      configure_opencode "$config_path"
    else
      configure_json_client "$config_path"
    fi

    log "${GREEN}✅ Successfully configured Clix MCP Server!${RESET}"
    log "${YELLOW}⚠️  IMPORTANT: Please RESTART $detected_client for the changes to take effect.${RESET}"
  else
    log "${YELLOW}⚠️  Could not determine config path for $detected_client${RESET}"
    log "${YELLOW}Please configure manually. See references/mcp-integration.md for instructions.${RESET}"
  fi
else
  log "${YELLOW}⚠️  Could not auto-detect MCP client.${RESET}"
  log "${BLUE}The package is ready to use. Configure manually:${RESET}"
  log "${BLUE}  - OpenCode: Add to opencode.json or opencode.jsonc${RESET}"
  log "${BLUE}  - Amp: Add to .vscode/settings.json or ~/.vscode/settings.json${RESET}"
  log "${BLUE}  - Codex: Add to ~/.codex/config.toml${RESET}"
  log "${BLUE}  - Cursor: Add to .cursor/mcp.json or ~/.cursor/mcp.json${RESET}"
  log "${BLUE}  - Claude Desktop: Add to config file${RESET}"
  log "${BLUE}See references/mcp-integration.md for detailed instructions.${RESET}"
fi

log "${GREEN}✅ Setup complete!${RESET}"
