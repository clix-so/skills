# Implementation Patterns

## Contents

- Where to place trackEvent calls
- De-duplication guidance
- Property hygiene
- Platform notes

## Where to place trackEvent calls

Prefer stable boundaries (low risk of duplicate firing):

- **User action confirmed**: button tap handler, after local validation passes
- **Network success**: after API responds 2xx / mutation completes
- **State change**: after the app updates state that the user can observe

Avoid:

- Render functions / recompositions
- Generic “screen mounted” hooks without guards

## De-duplication guidance

Ensure “once per action”:

- Debounce rapid taps where relevant
- Track on success callbacks rather than optimistic UI (unless intentional)
- For navigation-based events, ensure one event per screen transition

## Property hygiene

- Remove `null` values before sending (recommended across platforms)
- Keep property values small and stable
- Prefer enums/known strings over arbitrary user text

## Platform notes (what the skill should remember)

- **iOS**: properties are coerced to primitives; `Date` → ISO; other objects →
  string.
- **Android**: unknown objects become ISO (if recognized) else string; avoid
  nulls.
- **React Native**: `Date` is serialized to ISO; other values pass through.
- **Flutter**: null properties are filtered out; supports `messageId` in event
  API.
