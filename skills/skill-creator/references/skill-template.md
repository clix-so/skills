# Skill Template (for new Clix skills)

This document is a **copy/paste scaffold** for creating a new skill in the style
of this repository.

## Folder structure

Create:

- `skills/<folder-name>/SKILL.md`
- `skills/<folder-name>/LICENSE.txt`
- `skills/<folder-name>/references/<docs>.md` (at least 1 file)
- `skills/<folder-name>/scripts/<script>.sh` (at least 1 file)
- `skills/<folder-name>/examples/` (optional but recommended)

## `SKILL.md` skeleton

```markdown
---
name: clix-<kebab-case>
display-name: <Title Case>
short-description: <short>
description: <2-3 lines. Include when to use. Mention MCP-first explicitly.>
user-invocable: true
---

# <Title Case>

## What this skill does

- ...

## MCP-first (source of truth)

If Clix MCP tools are available, treat them as the **source of truth**:

- `clix-mcp-server:search_docs` for conceptual behavior + limits
- `clix-mcp-server:search_sdk` for platform signatures (when SDK calls are involved)

If MCP tools are not available:

- Ask to install MCP (preferred), otherwise use references/ and clearly warn that
  static docs may be outdated.

## Workflow (copy + check off)
```

<Skill> progress:

- [ ] 1. Confirm minimum inputs
- [ ] 2. Draft a plan artifact (JSON / checklist / table)
- [ ] 3. Validate plan (script)
- [ ] 4. Implement (code/config)
- [ ] 5. Verify (Clix console + runtime)

```

## Progressive Disclosure

- **Level 1**: This `SKILL.md`
- **Level 2**: `references/`
- **Level 3**: `examples/`
- **Level 4**: `scripts/` (execute; do not load)
```

## Quality checklist (before publishing)

- **No hallucinations**: every SDK signature in the skill can be re-derived from
  `clix-mcp-server:search_sdk` queries documented in references.
- **No secrets**: no project IDs / API keys / customer data in examples.
- **Scope crisp**: the skill does one job well; if it’s a grab bag, split it.
- **Backstops**: include a deterministic script for validating the “plan artifact”
  (JSON schema or structure checks).
- **Good UX**: minimal intake questions; concrete outputs the user can approve.
