# Personalization Template Syntax (Reference)

This reference summarizes the personalization syntax supported by Clix
templates.

## Data namespaces

- `user.*`: user properties (traits) you capture about a user
  - Examples: `user.username`, `user.tier`
- `event.*`: properties from the triggering event (event-triggered campaigns)
  - Examples: `event.distance`, `event.elapsedTime`
- `trigger.*`: custom properties passed via API trigger (API-triggered
  campaigns)
  - Examples: `trigger.promotion`, `trigger.discount`

Missing or undefined variables render as an **empty string**.

## Device and system variables

Clix templates also support device and environment variables:

- `device.id`
- `device.platform` (`IOS` or `ANDROID`)
- `device.locale`
- `device.language`
- `device.timezone`
- `user.id` (project user id)
- `event.name` (event name)

## Output variables

Print a value:

```liquid
{{ user.username }}
```

Nested / bracket access (useful when the key is not a valid identifier):

```liquid
{{ event["distance"] }}
```

## Conditionals

Use `{% if %}`, `{% else %}`, `{% endif %}` blocks.

Supported operators:

- `==`, `!=`, `>`, `<`, `>=`, `<=`
- `and`, `or`, `not`

Example:

```liquid
{% if event.distance >= 10 %}
Amazing! You completed a long run today.
{% else %}
Nice work! Keep it up!
{% endif %}
```

Notes:

- Unknown variables render as empty strings.
- Invalid conditions evaluate to `false`.

## Loops

Iterate over arrays with `{% for %}` / `{% endfor %}`:

```liquid
{% for badge in user.badges %}
- {{ badge }}
{% endfor %}
```

Guard empty collections:

```liquid
{% if user.badges and user.badges.size > 0 %}
{% for badge in user.badges %}
{{ badge }}
{% endfor %}
{% else %}
No badges yet.
{% endif %}
```

## Filters

Filters transform values inside `{{ ... }}` blocks and can be chained with `|`.

Supported filters:

- `upcase` / `downcase`
- `capitalize`
- `default`
- `join`
- `split`
- `escape`
- `strip`
- `replace`

Examples:

```liquid
Hi {{ user.username | default: "Guest" }}
```

```liquid
{{ user.username | default: "Guest" | upcase }}
```
