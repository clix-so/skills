# Agent Skills for Clix

This repository contains a collection of **Agent Skills for Clix**. Each skill is a self-contained package that can be loaded and executed by AI clients.

## Installing Skills

Agents skills on this repository are built on the [open agent skills standard](https://agentskills.io/home). Please refer to the [official documentation](https://agentskills.io/docs) for up-to-date information of support AI clients. Depending on the AI client you are using, you can install skills in different ways.

### Universal CLI (Recommended)

For **Cursor**, **VS Code**, **Claude Desktop**, **OpenCode**, **Goose**, **GitHub Copilot**, **Amp**, and **Letta**, use our CLI tool to install skills and configure the Clix MCP Server automatically:

```bash
npx clix-agent-skills install <skill-name> --client <your-client>
```

**Supported Clients:**
*   `--client amp` → `.amp/skills/`
*   `--client claude` → `.claude/skills/`
*   `--client codex` → `.codex/skills/`
*   `--client cursor` → `.cursor/skills/`
*   `--client github` → `.github/skills/`
*   `--client goose` → `.goose/skills/`
*   `--client letta` → `.letta/skills/`
*   `--client opencode` → `.opencode/skills/`
*   `--client vscode` → `.vscode/skills/`

### Claude Code

To register this repository as a plugin marketplace in Claude Code, run the following command:

```bash
/plugin marketplace add clix-so/skills
```

To install specific skills:
1. Select `Browse and install plugins`
2. Select `clix-agent-skills` from the list
3. Choose the skills you wish to install
4. Click `Install` to proceed

Alternatively, you can install a single skill directly by running:

```
/plugin install <plugin-name>@<marketplace-name>
/plugin install clix-integration@clix-agent-skills
```

Remember to restart Claude Code after installation to load the new skills.

### Codex

To manually install skills, save them from this repository into your Codex configuration directory: [https://developers.openai.com/codex/skills/#where-to-save-skills](https://developers.openai.com/codex/skills/#where-to-save-skills)

Or install a specific skill using the command line:

```
$skill-installer install https://github.com/clix-so/skills/tree/main/skills/integration
```

Ensure you restart Codex after installation to detect the new skills.

## Disclaimer

Please be aware that **these skills may occasionally fail or execute incorrectly** due to the non-deterministic nature of AI.

It is critical that you **carefully review and verify all actions** performed by these skills. While they are designed to be helpful, you remain responsible for checking their output before use. Use them with caution and supervision.

## License

Each skill in this repository is governed by its own license. For specific terms and conditions, please consult the `LICENSE` file located within each skill's individual directory.