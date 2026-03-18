# Repository Guidelines

This file provides guidance to coding assistants when working with code in this repository.

## Project Overview

This is the **Clix Agent Skills** repository - a collection of AI agent skills for Clix mobile SDK integration. Skills follow the [open agent skills standard](https://agentskills.io/home) and can be installed into various AI coding assistants (Claude Code, Cursor, Codex, etc.).

## Architecture

### Skill Structure

Each skill in `skills/<skill-name>/` follows this structure:

- `SKILL.md` - Main skill doc with YAML frontmatter (name, description, user-invocable)
- `LICENSE.txt` - License file
- `references/` - Supporting markdown docs (at least 1 file)
- `scripts/` - Deterministic bash validators (at least 1 file)
- `examples/` - Optional code examples
- `rules/` - Optional rule files (used by push-notification-best-practices)

### Adding a New Skill

When adding a new skill, follow these steps:

1. **Create skill folder** - `skills/<skill-name>/` with required structure (SKILL.md, references/, scripts/, LICENSE.txt)

2. **Update `.claude-plugin/marketplace.json`** (manual) - Add plugin entry:

   ```json
   {
     "name": "<skill-name>",
     "description": "<description for AI to know when to use>",
     "source": "./",
     "strict": false,
     "skills": ["./skills/<skill-name>"]
   }
   ```

3. **Update `README.md`** - Add skill to "Available Skills" section if public-facing

## Skill Conventions

Skills use **MCP-first** pattern: when Clix MCP tools are available, treat them as source of truth for SDK signatures and behavior.

SKILL.md frontmatter format:

```yaml
---
name: clix-<kebab-case>
display-name: <Title Case>
short-description: <short>
description: <2-3 lines>
user-invocable: true
---
```
