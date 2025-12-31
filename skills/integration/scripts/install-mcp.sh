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

log "${BLUE}📦 Installing Clix MCP Server...${RESET}"

# Check for npm
if ! command -v npm &> /dev/null; then
  log "${RED}❌ npm is not installed or not in PATH.${RESET}"
  log "${YELLOW}Please install Node.js and npm first: https://nodejs.org/${RESET}"
  exit 1
fi

# Install globally
log "${BLUE}Running: npm install -g @clix-so/clix-mcp-server@latest${RESET}"

if npm install -g @clix-so/clix-mcp-server@latest; then
  log "${GREEN}✅ Successfully installed Clix MCP Server!${RESET}"
  log "${YELLOW}⚠️  IMPORTANT: You must RESTART your AI Agent / IDE for the new server to be detected.${RESET}"
else
  log "${RED}❌ Installation failed.${RESET}"
  log "${YELLOW}Try running with sudo: sudo npm install -g @clix-so/clix-mcp-server@latest${RESET}"
  exit 1
fi
