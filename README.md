# Agent Skills for Clix

[![npm version](https://img.shields.io/npm/v/%40clix-so%2Fclix-agent-skills.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@clix-so/clix-agent-skills)
[![npm downloads](https://img.shields.io/npm/d18m/%40clix-so%2Fclix-agent-skills.svg)](https://www.npmjs.com/package/@clix-so/clix-agent-skills)

This repository contains a collection of **Agent Skills for Clix**. Each skill
is a self-contained package that can be loaded and executed by AI clients.

## Installing Skills

Agent skills in this repository are built on the
[open agent skills standard](https://agentskills.io/home). Please refer to the
[official documentation](https://agentskills.io/home#adoption) for up-to-date
information on supported AI clients. Depending on the AI client you are using,
you can install skills in different ways.

### Universal CLI (Recommended)

For Amp, Claude Code, Codex, Copilot, Cursor, Goose, Letta, OpenCode, and VS
Code, we recommend using our installer to set up the skills and automatically
configure the Clix MCP Server.

#### Installation Modes

The CLI supports two installation modes for skills:

1. **Repo Root (Project-specific)** - Installs skills to the current project
  directory (default)

- Skills are available only for the current project
- Best for project-specific configurations

2. **System Root (Global)** - Installs skills to your home directory

- Skills are available across all projects
- Best for personal development setup

**Note:** MCP (Model Context Protocol) server configuration is always set up
globally (system root), regardless of the skill installation mode. This ensures
the MCP server is available across all your projects.

```bash
# Install a specific skill (repo root - default)
npx @clix-so/clix-agent-skills@latest install <skill-name> --client <your-client>
# For example, to install a skill on Cursor:
npx @clix-so/clix-agent-skills@latest install integration --client cursor

# Install a specific skill globally (system root)
npx @clix-so/clix-agent-skills@latest install <skill-name> --client <your-client> --global
# For example:
npx @clix-so/clix-agent-skills@latest install integration --client cursor --global

# Install all available skills at once (repo root)
npx @clix-so/clix-agent-skills@latest install --all --client cursor
# This will install: integration, event-tracking, user-management, personalization, api-triggered-campaigns

# Install all available skills globally (system root)
npx @clix-so/clix-agent-skills@latest install --all --client cursor --global
```

### Available Skills

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

**Supported Clients:**


| Client         | Flag                                 | Default Path       |
| -------------- | ------------------------------------ | ------------------ |
| Amp            | `--client amp`                       | `.amp/skills/`     |
| Claude Code    | `--client claude` (or `claude-code`) | `.claude/skills/`  |
| Codex          | `--client codex`                     | `.codex/skills/`   |
| Cursor         | `--client cursor`                    | `.cursor/skills/`  |
| GitHub Copilot | `--client github`                    | `.github/skills/`  |
| Goose          | `--client goose`                     | `.goose/skills/`   |
| Letta          | `--client letta`                     | `.skills/`         |
| OpenCode       | `--client opencode`                  | `.opencode/skill/` |


### Claude Code

To register this repository as a plugin marketplace in Claude Code, run the
following command:

```bash
/plugin marketplace add clix-so/skills
/plugin install all@clix-agent-skills
```

To install specific skills:

1. Visit the Marketplace section in `/plugin`
2. Select `Browse plugins`
3. Choose the skills you wish to install
4. Install skill

Alternatively, you can install a single skill directly by running:

```bash
/plugin install <plugin-name>@<marketplace-name>
# For example
/plugin install clix-integration@clix-agent-skills
/plugin install clix-event-tracking@clix-agent-skills
/plugin install clix-user-management@clix-agent-skills
/plugin install clix-personalization@clix-agent-skills
/plugin install clix-api-triggered-campaigns@clix-agent-skills
```

**Note for Claude Code users**: Skills now support automatic hot-reload! Skills created or modified in `~/.claude/skills` or `.claude/skills` are immediately available without restarting the session. Skills also show real-time progress while executing, displaying tool uses as they happen.

### Codex

To manually install skills, save them from this repository into your Codex
configuration directory:
[https://developers.openai.com/codex/skills/#where-to-save-skills](https://developers.openai.com/codex/skills/#where-to-save-skills)

Or install a specific skill using the command line:

```bash
$skill-installer install <link-to-skill-folder>
# For example
$skill-installer install https://github.com/clix-so/skills/tree/main/skills/integration
```

Ensure you restart Codex after installation to detect the new skills.


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