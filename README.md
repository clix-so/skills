# Agent Skills for Clix

[![npm version](https://img.shields.io/npm/v/%40clix-so%2Fclix-agent-skills.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@clix-so/clix-agent-skills)
[![npm downloads](https://img.shields.io/npm/d18m/%40clix-so%2Fclix-agent-skills.svg)](https://www.npmjs.com/package/@clix-so/clix-agent-skills)

This repository contains a collection of Agent Skills for Clix. Each skill is a
separate module within this package that can be installed and used independently
by AI clients.

## Available Skills

### Clix Skills

- **clix-integration**: Seamlessly integrate Clix Mobile SDK to your mobile
  application with Clix MCP Server
- **clix-event-tracking**: Implement `Clix.trackEvent` with naming/schema best
  practices and campaign-ready validation
- **clix-user-management**: Implement `Clix.setUserId` + user properties with
  logout best practices, personalization (`user.*`), and audience targeting
- **clix-personalization**: Author and debug personalization templates for
  message content, deep links/URLs, and audience targeting rules (`user.*`,
  `event.*`, `trigger.*`, `device.*`)
- **clix-api-triggered-campaigns**: Configure API-triggered campaigns in the
  console and trigger them from your backend with safe auth, dynamic filters
  (`trigger.*`), and personalization patterns
- **clix-skill-creator**: Create new Clix agent skills by researching Clix SDK +
  docs via Clix MCP Server, then generating a complete skill folder (SKILL.md,
  references, scripts, examples) aligned with this repo’s conventions

### Skills for Mobile Developers

- **push-notification-best-practices**: Comprehensive mobile push notification
  guide for iOS (APNS) and Android (FCM). Use for setup, debugging delivery
  issues, implementing handlers, token management, deep linking, and
  troubleshooting platform-specific issues
- **auditing-permission-ux**: Audit notification permission request UX and
  settings recovery flows for iOS and Android
- **auditing-deep-link-contracts**: Audit deep link contracts with cold/warm
  start test vectors and routing checks

## Installing Skills

Agent skills in this repository are built on the
[open agent skills standard](https://agentskills.io/home). Please refer to the
[official documentation](https://agentskills.io/home#adoption) for up-to-date
information on supported AI clients.

### Quick Start (Recommended)

Install skills using the universal
[add-skill](https://github.com/vercel-labs/add-skill) CLI:

```bash
npx add-skill clix-so/skills
```

### Usage

```bash
# List available skills
npx add-skill clix-so/skills --list

# Install specific skills
npx add-skill clix-so/skills --skill integration --skill event-tracking

# Install globally (available across all projects)
npx add-skill clix-so/skills -g

# Install to specific agents
npx add-skill clix-so/skills -a claude-code -a cursor

# Non-interactive installation (CI/CD friendly)
npx add-skill clix-so/skills --skill integration -g -a claude-code -y
```

### Supported Agents

Skills can be installed to any of these supported agents. Use `-g, --global` to
install to the global path instead of project-level.

| Agent            | `--agent`       | Project Path            | Global Path                        |
| ---------------- | --------------- | ----------------------- | ---------------------------------- |
| Amp              | `amp`           | `.agents/skills/`       | `~/.config/agents/skills/`         |
| Antigravity      | `antigravity`   | `.agent/skills/`        | `~/.gemini/antigravity/global_skills/` |
| Claude Code      | `claude-code`   | `.claude/skills/`       | `~/.claude/skills/`                |
| Clawdbot         | `clawdbot`      | `skills/`               | `~/.clawdbot/skills/`              |
| Cline            | `cline`         | `.cline/skills/`        | `~/.cline/skills/`                 |
| Codex            | `codex`         | `.codex/skills/`        | `~/.codex/skills/`                 |
| Command Code     | `command-code`  | `.commandcode/skills/`  | `~/.commandcode/skills/`           |
| Continue         | `continue`      | `.continue/skills/`     | `~/.continue/skills/`              |
| Crush            | `crush`         | `.crush/skills/`        | `~/.config/crush/skills/`          |
| Cursor           | `cursor`        | `.cursor/skills/`       | `~/.cursor/skills/`                |
| Droid            | `droid`         | `.factory/skills/`      | `~/.factory/skills/`               |
| Gemini CLI       | `gemini-cli`    | `.gemini/skills/`       | `~/.gemini/skills/`                |
| GitHub Copilot   | `github-copilot`| `.github/skills/`       | `~/.copilot/skills/`               |
| Goose            | `goose`         | `.goose/skills/`        | `~/.config/goose/skills/`          |
| Kilo Code        | `kilo`          | `.kilocode/skills/`     | `~/.kilocode/skills/`              |
| Kiro CLI         | `kiro-cli`      | `.kiro/skills/`         | `~/.kiro/skills/`                  |
| MCPJam           | `mcpjam`        | `.mcpjam/skills/`       | `~/.mcpjam/skills/`                |
| OpenCode         | `opencode`      | `.opencode/skills/`     | `~/.config/opencode/skills/`       |
| OpenHands        | `openhands`     | `.openhands/skills/`    | `~/.openhands/skills/`             |
| Pi               | `pi`            | `.pi/skills/`           | `~/.pi/agent/skills/`              |
| Qoder            | `qoder`         | `.qoder/skills/`        | `~/.qoder/skills/`                 |
| Qwen Code        | `qwen-code`     | `.qwen/skills/`         | `~/.qwen/skills/`                  |
| Roo Code         | `roo`           | `.roo/skills/`          | `~/.roo/skills/`                   |
| Trae             | `trae`          | `.trae/skills/`         | `~/.trae/skills/`                  |
| Windsurf         | `windsurf`      | `.windsurf/skills/`     | `~/.codeium/windsurf/skills/`      |
| Zencoder         | `zencoder`      | `.zencoder/skills/`     | `~/.zencoder/skills/`              |
| Neovate          | `neovate`       | `.neovate/skills/`      | `~/.neovate/skills/`               |

### Alternative Installation Methods

#### Clix CLI

You can also use the Clix-specific CLI to install skills with automatic Clix MCP
Server configuration:

```bash
# Install a specific skill
npx @clix-so/clix-agent-skills@latest install <skill-name> --client <your-client>

# Install all skills globally
npx @clix-so/clix-agent-skills@latest install --all --client cursor --global
```

#### Claude Code (Plugin Marketplace)

Register this repository as a plugin marketplace in Claude Code:

```bash
/plugin marketplace add clix-so/skills
```

Then browse and install skills via `/plugin` → `Browse plugins`, or install
directly:

```bash
/plugin install clix-integration@clix-agent-skills
```

**Note**: Skills support automatic hot-reload in Claude Code. Changes to
`~/.claude/skills` or `.claude/skills` are immediately available.

#### Codex (skill-installer)

Install skills using the Codex skill-installer:

```bash
$skill-installer install https://github.com/clix-so/skills/tree/main/skills/integration
```

For manual installation, see the
[Codex documentation](https://developers.openai.com/codex/skills/#where-to-save-skills).

## Disclaimer

Please be aware that these skills may occasionally fail or execute incorrectly
due to the non-deterministic nature of AI. It is critical that you carefully
review and verify all actions performed by these skills. While they are designed
to be helpful, you remain responsible for checking their output before use.
Please use them with caution and supervision.

## License

Each skill in this repository is governed by its own license. For specific terms
and conditions, please consult the `LICENSE.txt` file located within each
skill's individual directory.
