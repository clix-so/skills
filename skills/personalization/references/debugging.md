# Debugging Personalization (Reference)

This guide helps you troubleshoot when a personalized message renders
unexpectedly.

## First principles (what the renderer does)

- Unknown / missing variables render as an **empty string**.
- Invalid conditions evaluate to `false`.
- Template rendering errors (syntax issues) surface in **Message Logs**.

## Quick checklist

- **Are you using the right namespace?**
  - Event-triggered campaign → use `event.*`
  - API-triggered campaign → use `trigger.*`
  - User traits/properties → use `user.*`
- **Is the variable actually set upstream?**
  - `user.*` comes from your app calling user property APIs.
  - `event.*` comes from the event payload you track.
  - `trigger.*` comes from properties in the API trigger request.
- **Is the template resilient to missing data?**
  - Add `| default: "..."` for strings.
  - Wrap optional blocks in `{% if ... %}` guards.
- **Are you looping safely?**
  - Guard with `collection and collection.size > 0` before `{% for %}`.

## Common failure modes

### 1) Blank values

Symptoms:

- Output is missing where you expected text.

Causes:

- Variable doesn’t exist for that user/campaign trigger.

Fix:

- Use `default` for output values:

```liquid
{{ user.username | default: "Guest" }}
```

### 2) Conditional branch never runs

Symptoms:

- Always hits the `{% else %}` branch.

Causes:

- `event.*` is missing (or you should be using `trigger.*`).
- Value is not the type you expect (e.g., string vs number).

Fix:

- Verify trigger type and payload shape.
- Keep comparisons simple and ensure the property is sent as a number when you
  compare numerically.

### 3) Syntax error / rendering error

Symptoms:

- Message fails to render or shows an error in logs.

Causes:

- Missing `{% endif %}` / `{% endfor %}`
- Unbalanced `{{` / `}}` or `{%` / `%}`

Fix:

- Check **Message Logs** first.
- Validate the template structure locally:

```bash
bash <skill-dir>/scripts/validate-template.sh path/to/template.liquid
```

## When to escalate (data issue vs template issue)

- If **defaults/guards** fix it → template issue.
- If values are always blank across many users → upstream tracking/user-property
  issue (fix app instrumentation).
