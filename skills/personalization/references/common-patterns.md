# Common Personalization Patterns (Reference)

Copy/paste starting points for Clix templates. Prefer simple templates with
guards/defaults.

## Welcome / fallback-safe greeting

```liquid
Hi {{ user.username | default: "there" }},
```

## Dynamic message body (event-triggered)

```liquid
Hi {{ user.username | default: "Runner" }},
you ran {{ event.distance | default: "?" }} miles in {{ event.elapsedTime | default: "?" }} seconds.
```

## Dynamic deep link / URL (event-triggered)

```liquid
myapp://run/summary?distance={{ event.distance }}&time={{ event.elapsedTime }}
```

Tip: If a value may contain spaces or special characters, prefer passing a
pre-encoded string from your app (or keep the template value simple).

## API-triggered promo (trigger.\*)

```liquid
🎉 {{ trigger.promotion | default: "A new promotion" }} is here!
Get {{ trigger.discount | default: "a discount" }} off now!
```

## Conditional title by threshold

```liquid
{% if event.distance >= 10 %}
Long run completed!
{% else %}
Good run today!
{% endif %}
```

## Nested conditions (keep minimal)

```liquid
{% if user.tier == "pro" %}
Pro stats updated successfully.
{% else %}
{% if event.elapsedTime > 3600 %}
You ran for more than an hour! Great job!
{% else %}
New record saved.
{% endif %}
{% endif %}
```

## Looping over an array with a guard

```liquid
{% if user.badges and user.badges.size > 0 %}
{% for badge in user.badges %}
- {{ badge }}
{% endfor %}
{% else %}
No badges yet.
{% endif %}
```
