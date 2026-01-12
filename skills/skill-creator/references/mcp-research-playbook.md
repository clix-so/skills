# MCP Research Playbook (Clix)

This playbook helps you **research accurately** before authoring a new Clix
skill. The goal is to collect enough evidence so the skill can be maintained
without guessing.

## Golden rules

- **SDK signatures must come from** `clix-mcp-server:search_sdk` (not memory).
- **Behavior/limits must come from** `clix-mcp-server:search_docs`.
- When evidence is unclear, write that uncertainty into the skill and ask the
  user for confirmation instead of asserting.

## Recommended research sequence

### 1) Identify the “feature nouns”

Extract the keywords from the user need:

- Channel: push / in-app / email / SMS / etc.
- Trigger type: event-triggered / API-triggered / scheduled
- Domain: journeys, segments, templates, attribution, deep links, etc.
- Platform: iOS / Android / Flutter / React Native (if SDK involved)

### 2) Search docs first (conceptual contracts)

Use `clix-mcp-server:search_docs` queries like:

- `"<feature> limits"`
- `"<feature> troubleshooting"`
- `"<feature> required fields"`
- `"<endpoint or concept> authentication headers"`
- `"Message Logs template rendering errors"`

Record:

- constraints/limits (e.g. maximum attributes, payload limits)
- required fields
- “this is how the console behaves” statements

### 3) Search SDK next (exact signatures)

Use `clix-mcp-server:search_sdk` queries like:

- `"initialize"`
- `"setUserId"`
- `"setUserProperty"`
- `"trackEvent"`
- `"push token"`
- `"<feature name>"` + platform filters

For each platform you care about, capture:

- method name + parameters (types if available)
- return type (sync vs async)
- error behavior (throws? returns error object?)

### 4) Convert evidence into a skill contract

In the new skill’s `SKILL.md`:

- include an MCP-first section
- include concrete “workflow” steps
- avoid large static API tables unless you can keep them synced (prefer “use MCP
  to fetch the exact signature” instead)

## Suggested “Evidence Pack” format

In the new skill’s `references/`, create an `evidence.md` (or similar) containing:

- the **queries** you ran
- the **high-signal excerpts** (short)
- a short “what we conclude” paragraph per excerpt

This makes maintenance and debugging dramatically easier.
